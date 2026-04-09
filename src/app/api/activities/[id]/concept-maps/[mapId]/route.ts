export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized } from '@/lib/middleware'

// Normalize ReactFlow node/edge shape back to the flat storage schema
// so the DB always holds a single canonical form.
type AnyRecord = Record<string, unknown>
function normalizeNodes(input: unknown): AnyRecord[] {
  if (!Array.isArray(input)) return []
  return input.map((n: AnyRecord, i) => {
    const data = (n.data as AnyRecord | undefined) || {}
    return {
      id: String(n.id ?? `n${i}`),
      label: (n.label as string) ?? (data.label as string) ?? '',
      category: (n.category as string) ?? (data.category as string) ?? '概念',
      color: (n.color as string) ?? (data.color as string) ?? '#6B7280',
      position: (n.position as AnyRecord) ?? { x: 0, y: 0 },
    }
  })
}
function normalizeEdges(input: unknown): AnyRecord[] {
  if (!Array.isArray(input)) return []
  return input.map((e: AnyRecord, i) => {
    const data = (e.data as AnyRecord | undefined) || {}
    return {
      id: String(e.id ?? `e${i}`),
      source: String(e.source ?? ''),
      target: String(e.target ?? ''),
      relation:
        (e.relation as string) ??
        (data.relation as string) ??
        (e.label as string) ??
        '',
    }
  })
}

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
