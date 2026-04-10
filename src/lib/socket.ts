import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verifyToken } from './auth'
import { prisma } from './prisma'
import { logActivity } from './activity-log'
import { rateLimit } from './rate-limit'

// In-memory roster of teachers currently connected to each group room.
// Keyed by groupId → Map<teacherId, teacherName>. Rebuilt on server restart.
const teacherRoster = new Map<string, Map<string, string>>()

function addTeacherToRoster(groupId: string, id: string, name: string) {
  if (!teacherRoster.has(groupId)) teacherRoster.set(groupId, new Map())
  teacherRoster.get(groupId)!.set(id, name)
}
function removeTeacherFromRoster(groupId: string, id: string) {
  const m = teacherRoster.get(groupId)
  if (m) {
    m.delete(id)
    if (m.size === 0) teacherRoster.delete(groupId)
  }
}
function listTeachersInRoom(groupId: string): Array<{ id: string; name: string }> {
  const m = teacherRoster.get(groupId)
  if (!m) return []
  return Array.from(m.entries()).map(([id, name]) => ({ id, name }))
}

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  // Allow comma-separated origins via CORS_ORIGIN, fall back to NEXT_PUBLIC_SOCKET_URL,
  // and only fall back to "*" in non-production for local dev convenience.
  const rawOrigins = process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_SOCKET_URL || ''
  const allowed = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const corsOrigin: string | string[] =
    allowed.length > 0
      ? allowed
      : process.env.NODE_ENV === 'production'
        ? []
        : '*'

  const io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: true },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    try {
      const payload = verifyToken(token)
      socket.data.user = payload
      next()
    } catch (err) {
      console.log('[Socket.IO] auth failed:', err)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log('[Socket.IO] client connected:', user.userId, user.role)

    // Join group room
    socket.on('join-group', async (groupId: string) => {
      // Leave any previously joined group room first (teacher can hop between groups)
      const prev = socket.data.groupId as string | undefined
      if (prev && prev !== groupId) {
        socket.leave(`group:${prev}`)
        if (user.role === 'teacher') {
          removeTeacherFromRoster(prev, user.userId)
          io.to(`group:${prev}`).emit('teacher-left', { id: user.userId })
        }
      }
      // Verify membership
      if (user.role === 'student') {
        const member = await prisma.groupMember.findFirst({
          where: { studentId: user.userId, groupId },
          include: { group: true, student: true },
        })
        if (!member) return socket.emit('error', 'Not a member of this group')
        socket.data.groupId = groupId
        socket.data.activityId = member.group.activityId
        socket.data.userName = member.student.name
      } else if (user.role === 'teacher') {
        // Teacher can join any group of their own activity
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          include: { activity: true },
        })
        if (!group) return socket.emit('error', 'Group not found')
        if (group.activity.teacherId !== user.userId) {
          return socket.emit('error', 'Not your activity')
        }
        const teacher = await prisma.teacher.findUnique({ where: { id: user.userId } })
        socket.data.groupId = groupId
        socket.data.activityId = group.activityId
        socket.data.userName = teacher?.name || 'Teacher'
      } else {
        return socket.emit('error', 'Forbidden')
      }

      socket.join(`group:${groupId}`)
      io.to(`group:${groupId}`).emit('user-joined', { userId: user.userId, role: user.role })

      // Announce teacher presence so clients can live-update the member list
      if (user.role === 'teacher') {
        addTeacherToRoster(groupId, user.userId, socket.data.userName || 'Teacher')
        io.to(`group:${groupId}`).emit('teacher-joined', {
          id: user.userId,
          name: socket.data.userName || 'Teacher',
        })
      }

      // Send the current teacher roster to the newly-joined socket (for students arriving late)
      socket.emit('teacher-roster', listTeachersInRoom(groupId))

      await logActivity({
        activityId: socket.data.activityId,
        userId: user.userId,
        userType: user.role,
        action: 'join',
        metadata: { groupId },
      })
    })

    // Send message
    socket.on('send-message', async (data: { content: string }) => {
      const groupId = socket.data.groupId
      if (!groupId) return socket.emit('error', 'Not in a group')

      // Rate limit
      if (!rateLimit(`chat:${user.userId}`, 30, 60_000)) {
        return socket.emit('error', 'Rate limit exceeded')
      }

      // Check activity is still active
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { activity: true },
      })
      if (!group || group.activity.status !== 'active') {
        return socket.emit('error', 'Discussion has ended')
      }

      // Resolve sender display name and type
      let senderName = 'Unknown'
      let senderType: 'student' | 'teacher' = 'student'
      if (user.role === 'student') {
        const student = await prisma.student.findUnique({ where: { id: user.userId } })
        senderName = student?.name || 'Unknown'
        senderType = 'student'
      } else if (user.role === 'teacher') {
        const teacher = await prisma.teacher.findUnique({ where: { id: user.userId } })
        senderName = teacher?.name || 'Teacher'
        senderType = 'teacher'
      }

      const message = await prisma.message.create({
        data: {
          groupId,
          senderId: user.userId,
          senderType,
          senderName,
          content: data.content,
        },
      })

      io.to(`group:${groupId}`).emit('new-message', {
        id: message.id,
        senderId: message.senderId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        timestamp: message.timestamp,
      })

      await logActivity({
        activityId: socket.data.activityId,
        userId: user.userId,
        userType: user.role,
        action: 'send_message',
        metadata: { groupId, messageId: message.id },
      })

      // Trigger AI response check
      setTimeout(async () => {
        try {
          const { handleAiTrigger } = await import('./ai-engine')
          console.log('[AI] triggering for group:', groupId)
          await handleAiTrigger(groupId, socket.data.activityId)
        } catch (err) {
          console.error('[AI] trigger error:', err)
        }
      }, 2000 + Math.random() * 3000)

      // Reset silence timer for AI auto-trigger on conversation lulls
      try {
        const { resetSilenceTimer } = await import('./ai-engine')
        const groupData = await prisma.group.findUnique({
          where: { id: groupId },
          include: { activity: true },
        })
        if (groupData) {
          const { mergeAiConfig } = await import('./ai-config')
          const config = mergeAiConfig(
            groupData.activity.aiConfig as Record<string, unknown>,
            groupData.aiConfig as Record<string, unknown> | null
          )
          if (config.silenceThreshold > 0 && config.triggerMode !== 'mention_only') {
            resetSilenceTimer(groupId, socket.data.activityId, config.silenceThreshold * 1000)
          }
        }
      } catch {
        // ai-engine not yet available
      }
    })

    // Typing indicator
    socket.on('typing', (isTyping: boolean) => {
      const groupId = socket.data.groupId
      if (!groupId) return
      socket.to(`group:${groupId}`).emit('user-typing', {
        userId: user.userId,
        name: socket.data.userName || 'Unknown',
        isTyping,
      })
    })

    // Waiting room
    socket.on('join-waiting', async (activityId: string) => {
      // Authorize: students must be enrolled in this activity; teachers must own it
      try {
        if (user.role === 'student') {
          const student = await prisma.student.findFirst({
            where: { id: user.userId, activityId },
          })
          if (!student) return socket.emit('error', 'Not enrolled in this activity')
        } else if (user.role === 'teacher') {
          const activity = await prisma.activity.findFirst({
            where: { id: activityId, teacherId: user.userId },
          })
          if (!activity) return socket.emit('error', 'Not your activity')
        } else {
          return socket.emit('error', 'Forbidden')
        }
        socket.join(`waiting:${activityId}`)
        console.log('[Socket.IO] join-waiting:', activityId, 'user:', user.userId)
      } catch (err) {
        console.error('[Socket.IO] join-waiting error:', err)
        socket.emit('error', 'join-waiting failed')
      }
    })

    socket.on('disconnect', () => {
      if (socket.data.groupId) {
        io.to(`group:${socket.data.groupId}`).emit('user-left', { userId: user.userId })
        if (user.role === 'teacher') {
          removeTeacherFromRoster(socket.data.groupId, user.userId)
          io.to(`group:${socket.data.groupId}`).emit('teacher-left', { id: user.userId })
        }
      }
    })
  })

  return io
}
