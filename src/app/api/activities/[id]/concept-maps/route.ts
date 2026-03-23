export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import { extractPdfText, generateConceptMap } from '@/lib/concept-map-generator'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const maps = await prisma.conceptMap.findMany({
      where: { activity: { id: params.id, teacherId: payload.userId } },
      include: { group: true },
      orderBy: [{ group: { groupNumber: 'asc' } }, { type: 'asc' }],
    })
    return NextResponse.json({ conceptMaps: maps })
  } catch {
    return unauthorized()
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId, status: 'ended' },
      include: { groups: true },
    })
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found or not ended' }, { status: 400 })
    }

    let pdfText = ''
    if (activity.pdfUrl) {
      pdfText = await extractPdfText(activity.pdfUrl)
    }

    const results: Array<{ groupId: string; groupNumber: number; status: string }> = []

    for (const group of activity.groups) {
      try {
        if (pdfText) {
          const pdfMap = await generateConceptMap(pdfText, 'pdf')
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
      } catch {
        results.push({ groupId: group.id, groupNumber: group.groupNumber, status: 'failed' })
      }
    }

    return NextResponse.json({ results })
  } catch {
    return unauthorized()
  }
}
