import { maskMessagesForStudent } from '@/lib/message-utils'

describe('Message API', () => {
  test('student API masks hidden AI peer messages', () => {
    const messages = [
      { id: '1', senderType: 'student', senderId: 's1', senderName: '张三', content: 'Hi', aiMetadata: null },
      { id: '2', senderType: 'ai', senderId: null, senderName: '王明', content: 'Hello', aiMetadata: { tokens: 10 } },
    ]
    const masked = maskMessagesForStudent(messages, 'hidden_ai_peer', 'group1')
    expect(masked[1].senderType).toBe('student')
    expect(masked[1].senderId).toBe('virtual-group1')
    expect(masked[1].aiMetadata).toBeUndefined()
  })
})
