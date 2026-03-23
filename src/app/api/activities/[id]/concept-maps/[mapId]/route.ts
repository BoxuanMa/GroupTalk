import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized } from '@/lib/middleware'

export async function GET(request: NextRequest, { params }: { params: { id: string; mapId: string } }) {
  const payload = getAuthPayload(request)
  if (!payload) return unauthorized()

  const map = await prisma.conceptMap.findFirst({
    where: { id: params.mapId, activityId: params.id },
    include: { group: true },
  })
  if (!map) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ conceptMap: map })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; mapId: string } }) {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'teacher') return unauthorized()

  const body = await request.json()

  const map = await prisma.conceptMap.update({
    where: { id: params.mapId },
    data: {
      ...(body.nodes && { nodes: body.nodes }),
      ...(body.edges && { edges: body.edges }),
      editedByTeacher: true,
      editedAt: new Date(),
    },
  })

  return NextResponse.json({ conceptMap: map })
}
