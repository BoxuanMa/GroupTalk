import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

export async function PATCH(request: NextRequest, { params }: { params: { id: string; groupId: string } }) {
  try {
    const payload = requireTeacher(request)
    const body = await request.json()

    const group = await prisma.group.findFirst({
      where: { id: params.groupId, activity: { id: params.id, teacherId: payload.userId } },
    })
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    // Move student to this group
    if (body.addStudentId) {
      await prisma.groupMember.updateMany({
        where: { studentId: body.addStudentId },
        data: { groupId: params.groupId },
      })
    }

    // Update AI role/config
    const updated = await prisma.group.update({
      where: { id: params.groupId },
      data: {
        ...(body.aiRole && { aiRole: body.aiRole }),
        ...(body.aiConfig !== undefined && { aiConfig: body.aiConfig }),
      },
      include: { members: { include: { student: true } } },
    })

    return NextResponse.json({ group: updated })
  } catch {
    return unauthorized()
  }
}
