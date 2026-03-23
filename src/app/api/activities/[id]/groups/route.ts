export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function assignGroups<T>(students: T[], size: { min: number; max: number }): T[][] {
  const shuffled = shuffleArray(students)
  const targetSize = Math.ceil((size.min + size.max) / 2)
  const numGroups = Math.max(1, Math.round(shuffled.length / targetSize))
  const groups: T[][] = Array.from({ length: numGroups }, () => [])

  shuffled.forEach((student, i) => {
    groups[i % numGroups].push(student)
  })

  return groups
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const groups = await prisma.group.findMany({
      where: { activity: { id: params.id, teacherId: payload.userId } },
      include: { members: { include: { student: true } } },
      orderBy: { groupNumber: 'asc' },
    })
    return NextResponse.json({ groups })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId, status: 'waiting' },
      include: { students: true },
    })
    if (!activity) return NextResponse.json({ error: 'Activity not found or not in waiting status' }, { status: 400 })

    const groupSize = activity.groupSize as { min: number; max: number }
    const studentGroups = assignGroups(activity.students, groupSize)

    // Delete existing groups
    await prisma.groupMember.deleteMany({ where: { group: { activityId: params.id } } })
    await prisma.group.deleteMany({ where: { activityId: params.id } })

    // Create new groups
    const defaultAiRole = (activity.aiConfig as Record<string, unknown>)?.role as string || 'system_helper'

    for (let i = 0; i < studentGroups.length; i++) {
      const group = await prisma.group.create({
        data: {
          activityId: params.id,
          groupNumber: i + 1,
          aiRole: defaultAiRole as 'system_helper' | 'known_ai_peer' | 'hidden_ai_peer',
        },
      })

      for (const student of studentGroups[i]) {
        await prisma.groupMember.create({
          data: { studentId: (student as { id: string }).id, groupId: group.id },
        })
      }
    }

    const groups = await prisma.group.findMany({
      where: { activityId: params.id },
      include: { members: { include: { student: true } } },
      orderBy: { groupNumber: 'asc' },
    })

    return NextResponse.json({ groups })
  } catch {
    return unauthorized()
  }
}
