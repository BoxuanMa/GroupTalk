export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized } from '@/lib/middleware'
import { mergeAiConfig } from '@/lib/ai-config'

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request)
  if (!payload || payload.role !== 'student') return unauthorized()

  const membership = await prisma.groupMember.findFirst({
    where: { studentId: payload.userId },
    include: {
      group: {
        include: {
          activity: { select: { id: true, title: true, pdfUrl: true, pdfFileName: true, status: true, aiConfig: true } },
          members: { include: { student: { select: { id: true, name: true, studentNumber: true } } } },
        },
      },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Not in a group yet' }, { status: 404 })
  }

  // Build member list including AI member
  const humanMembers = membership.group.members.map((m) => ({
    id: m.student.id,
    name: m.student.name,
    studentNumber: m.student.studentNumber,
    type: 'student' as const,
  }))

  const aiConfig = mergeAiConfig(
    (membership.group.activity as unknown as { aiConfig: Record<string, unknown> }).aiConfig || {},
    membership.group.aiConfig as Record<string, unknown> | null
  )

  // Add AI member (visible for system_helper and known_ai_peer, hidden for hidden_ai_peer)
  const aiMember = {
    id: `ai-${membership.groupId}`,
    name: aiConfig.displayName,
    type: 'ai' as const,
    aiRole: aiConfig.role,
  }

  const allMembers = aiConfig.role === 'hidden_ai_peer'
    ? [...humanMembers, { ...aiMember, type: 'student' as const }]
    : [...humanMembers, aiMember]

  return NextResponse.json({
    groupId: membership.groupId,
    groupNumber: membership.group.groupNumber,
    activity: membership.group.activity,
    aiRole: aiConfig.role,
    aiDisplayName: aiConfig.displayName,
    members: allMembers,
  })
}
