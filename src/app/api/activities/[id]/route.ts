export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import { getIO } from '@/lib/io-store'
import { rm } from 'fs/promises'
import path from 'path'

const VALID_TRANSITIONS: Record<string, string> = {
  draft: 'waiting',
  waiting: 'active',
  active: 'ended',
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
      include: {
        groups: {
          include: { members: { include: { student: true } }, _count: { select: { messages: true } } },
          orderBy: { groupNumber: 'asc' },
        },
        students: true,
      },
    })

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ activity })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') return unauthorized()
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const body = await request.json()

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Status transition validation
    if (body.status) {
      const allowed = VALID_TRANSITIONS[activity.status]
      if (body.status !== allowed) {
        return NextResponse.json({ error: `Cannot transition from ${activity.status} to ${body.status}` }, { status: 400 })
      }
    }

    const updated = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.status && { status: body.status }),
        ...(body.aiConfig && { aiConfig: body.aiConfig }),
        ...(body.groupSize && { groupSize: body.groupSize }),
      },
    })

    // When transitioning to active, notify waiting students via Socket.IO
    if (body.status === 'active') {
      const io = getIO()
      if (io) {
        const groups = await prisma.group.findMany({
          where: { activityId: params.id },
          include: { members: true },
        })
        for (const group of groups) {
          for (const member of group.members) {
            io.to(`waiting:${params.id}`).emit('activity-started', {
              studentId: member.studentId,
              groupId: group.id,
            })
          }
        }
      }
    }

    // When activity ends, clean up AI silence timers
    if (body.status === 'ended') {
      try {
        const { stopTimersForActivity } = await import('@/lib/ai-engine')
        await stopTimersForActivity(params.id)
      } catch { /* ai-engine may not be loaded */ }
    }

    return NextResponse.json({ activity: updated })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') return unauthorized()
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete everything tied to this activity in a transaction, in dependency order
    await prisma.$transaction(async (tx) => {
      const groups = await tx.group.findMany({
        where: { activityId: params.id },
        select: { id: true },
      })
      const groupIds = groups.map((g) => g.id)

      if (groupIds.length > 0) {
        await tx.message.deleteMany({ where: { groupId: { in: groupIds } } })
        await tx.groupMember.deleteMany({ where: { groupId: { in: groupIds } } })
        await tx.conceptMap.deleteMany({ where: { groupId: { in: groupIds } } })
      }
      await tx.activityLog.deleteMany({ where: { activityId: params.id } })
      await tx.group.deleteMany({ where: { activityId: params.id } })
      await tx.student.deleteMany({ where: { activityId: params.id } })
      await tx.activity.delete({ where: { id: params.id } })
    })

    // Best-effort: remove uploaded PDF directory
    try {
      const uploadsRoot = path.resolve(process.cwd(), 'uploads')
      const dir = path.resolve(uploadsRoot, params.id)
      if (dir.startsWith(uploadsRoot + path.sep)) {
        await rm(dir, { recursive: true, force: true })
      }
    } catch (err) {
      console.error('[activity DELETE] failed to remove uploads:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized') return unauthorized()
    console.error('[activity DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
