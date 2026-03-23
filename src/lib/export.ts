// src/lib/export.ts
import { Message, ActivityLog, Group, ConceptMap } from '@prisma/client'

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function messagesToCsv(messages: (Message & { group?: { groupNumber: number } })[]): string {
  const header = 'timestamp,group_id,sender_name,sender_type,content'
  const rows = messages.map((m) =>
    [
      m.timestamp.toISOString(),
      m.groupId,
      escapeCsv(m.senderName),
      m.senderType,
      escapeCsv(m.content),
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function aiLogToJson(messages: Message[]): string {
  const aiMessages = messages
    .filter((m) => m.senderType === 'ai' && m.aiMetadata)
    .map((m) => ({
      id: m.id,
      groupId: m.groupId,
      timestamp: m.timestamp,
      senderName: m.senderName,
      content: m.content,
      metadata: m.aiMetadata,
    }))
  return JSON.stringify(aiMessages, null, 2)
}

export function activityLogsToCsv(logs: ActivityLog[]): string {
  const header = 'timestamp,user_id,user_type,action,metadata'
  const rows = logs.map((l) =>
    [
      l.timestamp.toISOString(),
      l.userId,
      l.userType,
      l.action,
      escapeCsv(JSON.stringify(l.metadata)),
    ].join(',')
  )
  return [header, ...rows].join('\n')
}

export function formatExperimentConditions(
  groups: (Pick<Group, 'groupNumber' | 'aiRole'> & { _count: { members: number } })[]
): string {
  const header = 'group_number,ai_role,student_count'
  const rows = groups.map((g) => `${g.groupNumber},${g.aiRole},${g._count.members}`)
  return [header, ...rows].join('\n')
}

export function conceptMapsToJson(maps: ConceptMap[]): string {
  return JSON.stringify(
    maps.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      type: m.type,
      nodes: m.nodes,
      edges: m.edges,
      originalNodes: m.originalNodes,
      originalEdges: m.originalEdges,
      editedByTeacher: m.editedByTeacher,
      generatedAt: m.generatedAt,
      editedAt: m.editedAt,
    })),
    null,
    2
  )
}
