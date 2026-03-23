import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import crypto from 'crypto'

function generateJoinCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

export async function GET(request: NextRequest) {
  try {
    const payload = requireTeacher(request)
    const activities = await prisma.activity.findMany({
      where: { teacherId: payload.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { students: true, groups: true } } },
    })
    return NextResponse.json({ activities })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = requireTeacher(request)
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        teacherId: payload.userId,
        title,
        joinCode: generateJoinCode(),
      },
    })

    return NextResponse.json({ activity })
  } catch {
    return unauthorized()
  }
}
