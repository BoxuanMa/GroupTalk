import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verifyToken } from './auth'
import { prisma } from './prisma'
import { logActivity } from './activity-log'
import { rateLimit } from './rate-limit'

export function setupSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    try {
      const payload = verifyToken(token)
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user

    // Join group room
    socket.on('join-group', async (groupId: string) => {
      // Verify membership
      if (user.role === 'student') {
        const member = await prisma.groupMember.findFirst({
          where: { studentId: user.userId, groupId },
          include: { group: true },
        })
        if (!member) return socket.emit('error', 'Not a member of this group')
        socket.data.groupId = groupId
        socket.data.activityId = member.group.activityId
      } else {
        // Teacher can join any group
        const group = await prisma.group.findUnique({ where: { id: groupId } })
        if (!group) return socket.emit('error', 'Group not found')
        socket.data.groupId = groupId
        socket.data.activityId = group.activityId
      }

      socket.join(`group:${groupId}`)
      io.to(`group:${groupId}`).emit('user-joined', { userId: user.userId, role: user.role })

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

      // Get student name
      let senderName = 'Teacher'
      if (user.role === 'student') {
        const student = await prisma.student.findUnique({ where: { id: user.userId } })
        senderName = student?.name || 'Unknown'
      }

      const message = await prisma.message.create({
        data: {
          groupId,
          senderId: user.userId,
          senderType: 'student',
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

      // Trigger AI response check — direct function call (not Socket.IO event)
      // ai-engine.ts does not exist yet (Task 6), so wrap in try-catch
      setTimeout(async () => {
        try {
          const { handleAiTrigger } = await import('./ai-engine')
          handleAiTrigger(groupId, socket.data.activityId)
        } catch {
          // ai-engine module not yet implemented — silently ignore
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

    // Waiting room
    socket.on('join-waiting', (activityId: string) => {
      socket.join(`waiting:${activityId}`)
    })

    socket.on('disconnect', () => {
      if (socket.data.groupId) {
        io.to(`group:${socket.data.groupId}`).emit('user-left', { userId: user.userId })
      }
    })
  })

  return io
}
