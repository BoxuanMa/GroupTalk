import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(`join:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { joinCode, studentNumber, name } = await request.json()

  if (!joinCode || !studentNumber || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const activity = await prisma.activity.findUnique({ where: { joinCode } })
  if (!activity || activity.status !== 'waiting') {
    return NextResponse.json({ error: 'Invalid or inactive join code' }, { status: 404 })
  }

  const student = await prisma.student.upsert({
    where: { studentNumber_activityId: { studentNumber, activityId: activity.id } },
    update: { name },
    create: { studentNumber, name, activityId: activity.id },
  })

  const token = signToken({ userId: student.id, role: 'student', activityId: activity.id })
  return NextResponse.json({ token, student: { id: student.id, studentNumber, name }, activityId: activity.id })
}
