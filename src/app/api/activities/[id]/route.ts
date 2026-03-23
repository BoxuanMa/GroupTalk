export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

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
        groups: { include: { members: { include: { student: true } } } },
        students: true,
      },
    })

    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ activity })
  } catch {
    return unauthorized()
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
      const io = (global as Record<string, unknown>).__io as import('socket.io').Server | undefined
      if (io) {
        const groups = await prisma.group.findMany({
          where: { activityId: params.id },
          include: { members: { include: { student: true } } },
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

    return NextResponse.json({ activity: updated })
  } catch {
    return unauthorized()
  }
}
