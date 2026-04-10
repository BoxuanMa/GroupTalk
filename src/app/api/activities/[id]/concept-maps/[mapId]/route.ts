export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized } from '@/lib/middleware'
import { normalizeNodes, normalizeEdges } from '@/lib/concept-map-normalize'

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

  let body: { nodes?: unknown; edges?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const map = await prisma.conceptMap.update({
      where: { id: params.mapId },
      data: {
        ...(body.nodes !== undefined && {
          nodes: normalizeNodes(body.nodes) as unknown as Prisma.InputJsonValue,
        }),
        ...(body.edges !== undefined && {
          edges: normalizeEdges(body.edges) as unknown as Prisma.InputJsonValue,
        }),
        editedByTeacher: true,
        editedAt: new Date(),
      },
    })
    return NextResponse.json({ conceptMap: map })
  } catch (e) {
    console.error('PATCH concept-map failed:', e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
