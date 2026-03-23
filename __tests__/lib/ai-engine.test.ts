// Mock dependencies before importing ai-engine
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  }))
})

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}))

jest.mock('@/lib/activity-log', () => ({
  logActivity: jest.fn(),
}))

import { buildPrompt } from '@/lib/ai-engine'

describe('AI engine', () => {
  test('buildPrompt includes system prompt, PDF summary, and recent messages', () => {
    const messages = buildPrompt({
      systemPrompt: 'You are a student.',
      pdfSummary: 'This lesson covers photosynthesis.',
      chatHistory: [
        { senderName: '张三', content: '光合作用的原理是什么？' },
        { senderName: '李四', content: '我记得和叶绿素有关。' },
      ],
    })

    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('You are a student.')
    expect(messages[0].content).toContain('photosynthesis')
    expect(messages.length).toBe(3) // system + 2 chat messages
  })

  test('buildPrompt truncates to maxMessages', () => {
    const chatHistory = Array.from({ length: 50 }, (_, i) => ({
      senderName: `User${i}`,
      content: `Message ${i}`,
    }))

    const messages = buildPrompt({
      systemPrompt: 'test',
      pdfSummary: 'test',
      chatHistory,
      maxMessages: 20,
    })

    // system + 20 recent messages
    expect(messages.length).toBe(21)
  })
})
