import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { mergeAiConfig, AiConfig } from './ai-config'
import { logActivity } from './activity-log'
import { getIO } from './io-store'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface ChatMessage {
  senderName: string
  senderType: string
  content: string
}

export function buildPrompt(params: {
  systemPrompt: string
  pdfSummary: string
  chatHistory: ChatMessage[]
  maxMessages?: number
}): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const { systemPrompt, pdfSummary, chatHistory, maxMessages = 30 } = params

  let system = systemPrompt + '\n\n【格式要求】直接输出你要说的内容，不要在回复前面加任何人名或冒号前缀。'
  if (pdfSummary) {
    system += '\n\n'
    system += '【重要】以下是本次讨论的课件/学习材料的完整内容，你必须仔细阅读并基于这些内容参与讨论、回答问题。'
    system += '当学生提问时，优先从课件内容中寻找答案和依据。\n\n'
    system += '=== 课件内容 ===\n'
    system += pdfSummary
    system += '\n=== 课件内容结束 ==='
  }

  console.log(`[AI] buildPrompt: system ${system.length} chars, pdf ${pdfSummary.length} chars, ${chatHistory.length} msgs`)

  const recentMessages = chatHistory.slice(-maxMessages).map((msg) => {
    if (msg.senderType === 'ai') {
      return { role: 'assistant' as const, content: msg.content }
    }
    return { role: 'user' as const, content: `${msg.senderName}: ${msg.content}` }
  })

  return [{ role: 'system', content: system }, ...recentMessages]
}

// Track last AI message time per group for frequency limiting
const lastAiMessage = new Map<string, number>()
// Track last message time per group for silence detection
const lastGroupMessage = new Map<string, number>()
// Active silence timers per group
const silenceTimers = new Map<string, NodeJS.Timeout>()
// Per-group lock to prevent concurrent AI triggers
const aiLocks = new Set<string>()

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
  // @mention always bypasses frequency limit and trigger mode
  if (mentionedAi) {
    return true
  }

  if (config.triggerMode === 'mention_only') {
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
  pdfImages?: string[]
}): Promise<{ content: string; metadata: Record<string, unknown> } | null> {
  const { groupId, config, pdfSummary, pdfImages } = params

  const messages = await prisma.message.findMany({
    where: { groupId },
    orderBy: { timestamp: 'desc' },
    take: 30,
  })

  const chatHistory = messages.reverse().map((m) => ({
    senderName: m.senderName,
    senderType: m.senderType,
    content: m.content,
  }))

  const prompt = buildPrompt({
    systemPrompt: config.systemPrompt,
    pdfSummary,
    chatHistory,
  })

  // If we have PDF images, inject them as a user message (OpenAI only allows images in 'user' role)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let apiMessages: any[] = prompt
  if (pdfImages && pdfImages.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfUserMessage: any = {
      role: 'user',
      content: [
        { type: 'text', text: '【课件内容】以下是本次讨论的课件页面截图，请仔细查看并基于图中信息参与讨论和回答问题：' },
        ...pdfImages.map((img) => ({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${img}`, detail: 'low' as const },
        })),
      ],
    }
    // system prompt -> PDF images (as user) -> chat history
    apiMessages = [
      prompt[0], // system
      pdfUserMessage,
      ...prompt.slice(1), // chat messages
    ]
  }

  const startTime = Date.now()

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: config.model,
      messages: apiMessages,
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
        messageCount: prompt.length,
        response: responseContent,
        pdfMode: pdfImages ? 'vision' : 'text',
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

/** Stop all silence timers for groups belonging to an activity */
export async function stopTimersForActivity(activityId: string) {
  const groups = await prisma.group.findMany({
    where: { activityId },
    select: { id: true },
  })
  for (const g of groups) stopSilenceTimer(g.id)
}

export async function handleAiTrigger(groupId: string, activityId: string) {
  // Per-group lock: skip if another trigger is already running
  if (aiLocks.has(groupId)) return
  aiLocks.add(groupId)

  try {
    await _handleAiTriggerInner(groupId, activityId)
  } finally {
    aiLocks.delete(groupId)
  }
}

async function _handleAiTriggerInner(groupId: string, activityId: string) {
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

  // Set optimistically to prevent concurrent triggers
  lastAiMessage.set(groupId, Date.now())

  // Show typing indicator
  const io = getIO()
  if (io) {
    io.to(`group:${groupId}`).emit('user-typing', {
      userId: 'ai',
      name: config.displayName,
      isTyping: true,
    })
  }

  let pdfSummary = ''
  let pdfImages: string[] | undefined
  if (group.activity.pdfUrl) {
    try {
      const { extractPdfText, isTextReadable, pdfToImages } = await import('./concept-map-generator')

      // Try cached text first
      let text = group.activity.pdfText as string | null
      if (!text) {
        text = await extractPdfText(group.activity.pdfUrl)
        // Cache for next time
        await prisma.activity.update({
          where: { id: activityId },
          data: { pdfText: text },
        })
      }

      if (text && isTextReadable(text)) {
        // Good text — use it
        pdfSummary = text.slice(0, 8000)
        console.log(`[AI] PDF mode: text (${pdfSummary.length} chars)`)
      } else {
        // Bad text (scanned/image PDF) — fall back to vision
        console.log(`[AI] PDF text unreadable, switching to vision mode`)
        pdfImages = await pdfToImages(group.activity.pdfUrl, 4)
        console.log(`[AI] PDF mode: vision (${pdfImages.length} pages)`)
      }
    } catch (err) {
      console.error('[AI] PDF processing failed:', err)
    }
  }

  const result = await generateAiResponse({ groupId, activityId, config, pdfSummary, pdfImages })

  // Stop typing indicator
  if (io) {
    io.to(`group:${groupId}`).emit('user-typing', {
      userId: 'ai',
      name: config.displayName,
      isTyping: false,
    })
  }

  if (!result) return

  const message = await prisma.message.create({
    data: {
      groupId,
      senderId: null,
      senderType: 'ai',
      senderName: config.displayName,
      content: result.content,
      aiMetadata: result.metadata as unknown as Prisma.InputJsonValue,
    },
  })

  await logActivity({
    activityId,
    userId: 'ai',
    userType: 'ai',
    action: 'send_message',
    metadata: { groupId, messageId: message.id },
  })

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
