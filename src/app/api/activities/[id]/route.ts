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
      const io = getIO()
      console.log('[DEBUG] activity-started: io exists?', !!io)
      if (io) {
        const groups = await prisma.group.findMany({
          where: { activityId: params.id },
          include: { members: { include: { student: true } } },
        })
        console.log('[DEBUG] groups to notify:', groups.length)
        for (const group of groups) {
          for (const member of group.members) {
            console.log('[DEBUG] emitting activity-started to', `waiting:${params.id}`, 'studentId:', member.studentId)
            io.to(`waiting:${params.id}`).emit('activity-started', {
              studentId: member.studentId,
              groupId: group.id,
            })
          }
        }
      } else {
        console.log('[DEBUG] io is undefined! Cannot notify students.')
      }
    }

    return NextResponse.json({ activity: updated })
  } catch {
    return unauthorized()
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
    console.error('[activity DELETE] error:', err)
    return unauthorized()
  }
}
