export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const payload = requireTeacher(request)
    const teacher = await prisma.teacher.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, name: true },
    })
    if (!teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ teacher })
  } catch {
    return unauthorized()
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = requireTeacher(request)
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const teacher = await prisma.teacher.update({
      where: { id: payload.userId },
      data: { name },
      select: { id: true, username: true, name: true },
    })
    return NextResponse.json({ teacher })
  } catch {
    return unauthorized()
  }
}
