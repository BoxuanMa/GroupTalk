export const dynamic = 'force-dynamic'

// src/app/api/activities/[id]/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireTeacher, unauthorized } from '@/lib/middleware'
import {
  messagesToCsv,
  aiLogToJson,
  activityLogsToCsv,
  formatExperimentConditions,
  conceptMapsToJson,
} from '@/lib/export'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = requireTeacher(request)
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const activity = await prisma.activity.findFirst({
      where: { id: params.id, teacherId: payload.userId },
    })
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (type === 'messages') {
      const messages = await prisma.message.findMany({
        where: { group: { activityId: params.id } },
        orderBy: { timestamp: 'asc' },
      })
      return new NextResponse(messagesToCsv(messages), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="messages.csv"' },
      })
    }

    if (type === 'ai-logs') {
      const messages = await prisma.message.findMany({
        where: { group: { activityId: params.id }, senderType: 'ai' },
        orderBy: { timestamp: 'asc' },
      })
      return new NextResponse(aiLogToJson(messages), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="ai-logs.json"' },
      })
    }

    if (type === 'activity-logs') {
      const logs = await prisma.activityLog.findMany({
        where: { activityId: params.id },
        orderBy: { timestamp: 'asc' },
      })
      return new NextResponse(activityLogsToCsv(logs), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="activity-logs.csv"' },
      })
    }

    if (type === 'concept-maps') {
      const maps = await prisma.conceptMap.findMany({
        where: { activityId: params.id },
      })
      return new NextResponse(conceptMapsToJson(maps), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="concept-maps.json"' },
      })
    }

    if (type === 'conditions') {
      const groups = await prisma.group.findMany({
        where: { activityId: params.id },
        include: { _count: { select: { members: true } } },
        orderBy: { groupNumber: 'asc' },
      })
      return new NextResponse(formatExperimentConditions(groups), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="experiment-conditions.csv"' },
      })
    }

    // type === 'all': return JSON summary
    return NextResponse.json({
      exports: [
        { type: 'messages', format: 'CSV', description: '聊天记录' },
        { type: 'ai-logs', format: 'JSON', description: 'AI 日志' },
        { type: 'activity-logs', format: 'CSV', description: '行为日志' },
        { type: 'concept-maps', format: 'JSON', description: '概念图数据' },
        { type: 'conditions', format: 'CSV', description: '实验条件' },
      ],
    })
  } catch {
    return unauthorized()
  }
}
