import OpenAI from 'openai'
import { prisma } from './prisma'
import { mergeAiConfig, AiConfig } from './ai-config'
import { logActivity } from './activity-log'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  senderName: string
  content: string
}

export function buildPrompt(params: {
  systemPrompt: string
  pdfSummary: string
  chatHistory: ChatMessage[]
  maxMessages?: number
}): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const { systemPrompt, pdfSummary, chatHistory, maxMessages = 30 } = params

  const system = `${systemPrompt}\n\n课件内容摘要：\n${pdfSummary}`

  const recentMessages = chatHistory.slice(-maxMessages).map((msg) => ({
    role: 'user' as const,
    content: `${msg.senderName}: ${msg.content}`,
  }))

  return [{ role: 'system', content: system }, ...recentMessages]
}

// Track last AI message time per group for frequency limiting
const lastAiMessage = new Map<string, number>()
// Track last message time per group for silence detection
const lastGroupMessage = new Map<string, number>()
// Active silence timers per group
const silenceTimers = new Map<string, NodeJS.Timeout>()

export function startSilenceTimer(groupId: string, activityId: string, thresholdMs: number) {
  const existing = silenceTimers.get(groupId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    handleAiTrigger(groupId, activityId)
  }, thresholdMs)
  silenceTimers.set(groupId, timer)
}

export function resetSilenceTimer(groupId: string, activityId: string, thresholdMs: number) {
  lastGroupMessage.set(groupId, Date.now())
  startSilenceTimer(groupId, activityId, thresholdMs)
}

export function stopSilenceTimer(groupId: string) {
  const timer = silenceTimers.get(groupId)
  if (timer) {
    clearTimeout(timer)
    silenceTimers.delete(groupId)
  }
}

export async function shouldTriggerAi(
  groupId: string,
  config: AiConfig,
  mentionedAi: boolean
): Promise<boolean> {
  if (config.triggerMode === 'mention_only' && !mentionedAi) {
    return false
  }

  const lastTime = lastAiMessage.get(groupId) || 0
  const minInterval = (60 / config.maxFrequency) * 1000
  if (Date.now() - lastTime < minInterval) {
    return false
  }

  return true
}

export async function generateAiResponse(params: {
  groupId: string
  activityId: string
  config: AiConfig
  pdfSummary: string
}): Promise<{ content: string; metadata: Record<string, unknown> } | null> {
  const { groupId, config, pdfSummary } = params

  const messages = await prisma.message.findMany({
    where: { groupId },
    orderBy: { timestamp: 'desc' },
    take: 30,
  })

  const chatHistory = messages.reverse().map((m) => ({
    senderName: m.senderName,
    content: m.content,
  }))

  const prompt = buildPrompt({
    systemPrompt: config.systemPrompt,
    pdfSummary,
    chatHistory,
  })

  const startTime = Date.now()

  try {
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: prompt,
      temperature: config.temperature,
      max_tokens: 500,
    })

    const latency = Date.now() - startTime
    const responseContent = completion.choices[0]?.message?.content || ''

    lastAiMessage.set(groupId, Date.now())

    return {
      content: responseContent,
      metadata: {
        model: config.model,
        prompt: prompt,
        response: responseContent,
        tokens: {
          prompt: completion.usage?.prompt_tokens,
          completion: completion.usage?.completion_tokens,
          total: completion.usage?.total_tokens,
        },
        latency,
      },
    }
  } catch (error) {
    console.error('AI generation failed:', error)
    return null
  }
}

export async function handleAiTrigger(groupId: string, activityId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { activity: true },
  })
  if (!group || group.activity.status !== 'active') return

  const config = mergeAiConfig(
    group.activity.aiConfig as Record<string, unknown>,
    group.aiConfig as Record<string, unknown> | null
  )

  const lastMsg = await prisma.message.findFirst({
    where: { groupId },
    orderBy: { timestamp: 'desc' },
  })

  const mentionedAi = lastMsg?.content.includes(`@${config.displayName}`) ||
    lastMsg?.content.includes('@AI') ||
    lastMsg?.content.includes('@ai') || false

  if (!(await shouldTriggerAi(groupId, config, mentionedAi))) return

  let pdfSummary = ''
  if (group.activity.pdfUrl) {
    pdfSummary = '(PDF content available)'
  }

  const result = await generateAiResponse({ groupId, activityId, config, pdfSummary })
  if (!result) return

  const message = await prisma.message.create({
    data: {
      groupId,
      senderId: null,
      senderType: 'ai',
      senderName: config.displayName,
      content: result.content,
      aiMetadata: result.metadata,
    },
  })

  await logActivity({
    activityId,
    userId: 'ai',
    userType: 'ai',
    action: 'send_message',
    metadata: { groupId, messageId: message.id },
  })

  const io = (global as Record<string, unknown>).__io as import('socket.io').Server | undefined
  if (io) {
    const emitData: Record<string, unknown> = {
      id: message.id,
      senderName: config.displayName,
      content: result.content,
      timestamp: message.timestamp,
    }

    if (config.role === 'hidden_ai_peer') {
      emitData.senderType = 'student'
      emitData.senderId = `virtual-${groupId}`
    } else {
      emitData.senderType = 'ai'
      emitData.senderId = null
    }

    io.to(`group:${groupId}`).emit('new-message', emitData)
  }
}
