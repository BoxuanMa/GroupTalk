// __tests__/lib/export.test.ts
import { messagesToCsv, formatExperimentConditions } from '@/lib/export'

describe('Export', () => {
  test('messagesToCsv formats messages correctly', () => {
    const messages = [
      { timestamp: new Date('2026-03-23T10:00:00Z'), senderName: '张三', senderType: 'student', content: 'Hello', groupId: 'g1' },
    ]
    const csv = messagesToCsv(messages as never[])
    expect(csv).toContain('timestamp,group_id,sender_name,sender_type,content')
    expect(csv).toContain('张三')
    expect(csv).toContain('student')
  })

  test('formatExperimentConditions lists group AI roles', () => {
    const groups = [
      { groupNumber: 1, aiRole: 'system_helper', _count: { members: 3 } },
      { groupNumber: 2, aiRole: 'hidden_ai_peer', _count: { members: 4 } },
    ]
    const csv = formatExperimentConditions(groups as never[])
    expect(csv).toContain('group_number,ai_role,student_count')
    expect(csv).toContain('1,system_helper,3')
  })
})
