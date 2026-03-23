import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const teacher = await prisma.teacher.findUnique({ where: { username } })
  if (!teacher || !(await verifyPassword(password, teacher.password))) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = signToken({ userId: teacher.id, role: 'teacher' })
  return NextResponse.json({ token, teacher: { id: teacher.id, username: teacher.username, name: teacher.name } })
}
