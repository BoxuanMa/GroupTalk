import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'student') return unauthorized()

  const membership = await prisma.groupMember.findFirst({
    where: { studentId: payload.userId },
    include: {
      group: {
        include: {
          activity: { select: { id: true, title: true, pdfUrl: true, pdfFileName: true, status: true } },
          members: { include: { student: { select: { id: true, name: true, studentNumber: true } } } },
        },
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Not in a group yet' }, { status: 404 })
  }

  return NextResponse.json({
    groupId: membership.groupId,
    groupNumber: membership.group.groupNumber,
    activity: membership.group.activity,
    members: membership.group.members.map((m) => ({
      id: m.student.id,
      name: m.student.name,
      studentNumber: m.student.studentNumber,
    })),
  })
}
