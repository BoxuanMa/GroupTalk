import { prisma } from './prisma'

export async function logActivity(params: {
  activityId: string
  userId: string
  userType: 'teacher' | 'student' | 'ai'
  action: string
  metadata?: Record<string, unknown>
}) {
  await prisma.activityLog.create({
    data: {
      activityId: params.activityId,
      userId: params.userId,
      userType: params.userType,
      action: params.action,
      metadata: params.metadata || {},
    },
  })
}
