export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import { generateConceptMap, generatePdfConceptMap } from '@/lib/concept-map-generator'
import { normalizeNodes, normalizeEdges } from '@/lib/concept-map-normalize'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const maps = await prisma.conceptMap.findMany({
      where: { activity: { id: params.id, teacherId: payload.userId } },
      include: { group: true },
      orderBy: [{ group: { groupNumber: 'asc' } }, { type: 'asc' }],
    })
    // Normalize on read so legacy records (saved in ReactFlow nested shape)
    // come back in the canonical flat schema the UI expects.
    const conceptMaps = maps.map((m) => ({
      ...m,
      nodes: normalizeNodes(m.nodes),
      edges: normalizeEdges(m.edges),
    }))
    return NextResponse.json({ conceptMaps })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let payload
  try {
    payload = requireTeacher(request)
  } catch {
    return unauthorized()
  }

  try {
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId, status: 'ended' },
      include: { groups: true },
    })
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found or not ended' }, { status: 400 })
    }

    // Generate PDF concept map once (same for all groups)
    let pdfMap: { nodes: unknown[]; edges: unknown[] } | null = null
    if (activity.pdfUrl) {
      try {
        pdfMap = await generatePdfConceptMap(activity.pdfUrl)
        console.log('[ConceptMap] PDF map generated:', pdfMap.nodes.length, 'nodes,', pdfMap.edges.length, 'edges')
      } catch (pdfErr) {
        console.error('PDF concept map generation failed:', pdfErr)
      }
    }

    const results: Array<{ groupId: string; groupNumber: number; status: string }> = []

    for (const group of activity.groups) {
      try {
        if (pdfMap && pdfMap.nodes.length > 0) {
          console.log(`[Route] Saving PDF map for group ${group.groupNumber}: ${pdfMap.nodes.length} nodes, ${pdfMap.edges.length} edges`)
          await prisma.conceptMap.upsert({
            where: { id: `${group.id}-pdf` },
            update: { nodes: pdfMap.nodes as unknown as Prisma.InputJsonValue, edges: pdfMap.edges as unknown as Prisma.InputJsonValue, originalNodes: pdfMap.nodes as unknown as Prisma.InputJsonValue, originalEdges: pdfMap.edges as unknown as Prisma.InputJsonValue },
            create: {
              id: `${group.id}-pdf`,
              activityId: params.id,
              groupId: group.id,
              type: 'pdf_based',
              nodes: pdfMap.nodes as unknown as Prisma.InputJsonValue,
              edges: pdfMap.edges as unknown as Prisma.InputJsonValue,
              originalNodes: pdfMap.nodes as unknown as Prisma.InputJsonValue,
              originalEdges: pdfMap.edges as unknown as Prisma.InputJsonValue,
            },
          })
        }

        const messages = await prisma.message.findMany({
          where: { groupId: group.id },
          orderBy: { timestamp: 'asc' },
          take: 200,
        })
        const chatText = messages.map((m) => `${m.senderName}: ${m.content}`).join('\n')

        if (chatText) {
          const chatMap = await generateConceptMap(chatText, 'chat')
          await prisma.conceptMap.upsert({
            where: { id: `${group.id}-chat` },
            update: { nodes: chatMap.nodes as unknown as Prisma.InputJsonValue, edges: chatMap.edges as unknown as Prisma.InputJsonValue, originalNodes: chatMap.nodes as unknown as Prisma.InputJsonValue, originalEdges: chatMap.edges as unknown as Prisma.InputJsonValue },
            create: {
              id: `${group.id}-chat`,
              activityId: params.id,
              groupId: group.id,
              type: 'chat_based',
              nodes: chatMap.nodes as unknown as Prisma.InputJsonValue,
              edges: chatMap.edges as unknown as Prisma.InputJsonValue,
              originalNodes: chatMap.nodes as unknown as Prisma.InputJsonValue,
              originalEdges: chatMap.edges as unknown as Prisma.InputJsonValue,
            },
          })
        }

        results.push({ groupId: group.id, groupNumber: group.groupNumber, status: 'success' })
      } catch (groupErr) {
        console.error(`Group ${group.groupNumber} concept map failed:`, groupErr)
        results.push({ groupId: group.id, groupNumber: group.groupNumber, status: 'failed' })
      }
    }

    return NextResponse.json({ results })
  } catch (error: unknown) {
    console.error('Concept map generation error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
