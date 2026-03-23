import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password, name } = await request.json()

  if (!username || !password || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.teacher.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'Username taken' }, { status: 409 })
  }

  const teacher = await prisma.teacher.create({
    data: { username, password: await hashPassword(password), name },
  })

  const token = signToken({ userId: teacher.id, role: 'teacher' })
  return NextResponse.json({ token, teacher: { id: teacher.id, username: teacher.username, name: teacher.name } })
}
