import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthPayload, unauthorized, forbidden } from '@/lib/middleware'

// Exported for testing
export function maskMessagesForStudent(
  messages: Array<Record<string, unknown>>,
  aiRole: string,
  groupId: string
): Array<Record<string, unknown>> {
  return messages.map((msg) => {
    if (msg.senderType === 'ai' && aiRole === 'hidden_ai_peer') {
      const { aiMetadata, ...rest } = msg
      void aiMetadata
      return { ...rest, senderType: 'student', senderId: `virtual-${groupId}` }
    }
    const { aiMetadata, ...rest } = msg
    void aiMetadata
    return rest
  })
}

export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  const payload = getAuthPayload(request)
  if (!payload) return unauthorized()

  const group = await prisma.group.findUnique({
    where: { id: params.groupId },
    include: { activity: true },
  })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Authorization: student must be member, teacher must own activity
  if (payload.role === 'student') {
    const member = await prisma.groupMember.findFirst({
      where: { studentId: payload.userId, groupId: params.groupId },
    })
    if (!member) return forbidden()
  } else if (payload.role === 'teacher') {
    if (group.activity.teacherId !== payload.userId) return forbidden()
  }

  const messages = await prisma.message.findMany({
    where: { groupId: params.groupId },
    orderBy: { timestamp: 'asc' },
  })

  // For teacher, return full data with aiMetadata
  if (payload.role === 'teacher') {
    const result = messages.map((msg) => ({
      id: msg.id,
      groupId: msg.groupId,
      senderId: msg.senderId,
      senderType: msg.senderType,
      senderName: msg.senderName,
      content: msg.content,
      timestamp: msg.timestamp,
      aiMetadata: msg.aiMetadata,
    }))
    return NextResponse.json({ messages: result })
  }

  // For student, mask hidden AI peer messages
  const raw = messages.map((msg) => ({
    id: msg.id,
    groupId: msg.groupId,
    senderId: msg.senderId,
    senderType: msg.senderType,
    senderName: msg.senderName,
    content: msg.content,
    timestamp: msg.timestamp,
    aiMetadata: msg.aiMetadata,
  }))

  const result = maskMessagesForStudent(raw, group.aiRole, params.groupId)
  return NextResponse.json({ messages: result })
}
