import { mergeAiConfig, getDefaultConfig } from '@/lib/ai-config'

describe('AI config', () => {
  test('getDefaultConfig returns system_helper defaults', () => {
    const config = getDefaultConfig('system_helper')
    expect(config.triggerMode).toBe('mention_only')
    expect(config.displayName).toBe('AI助手')
  })

  test('mergeAiConfig overrides activity config with group config', () => {
    const activityConfig = { role: 'system_helper', temperature: 0.7 }
    const groupConfig = { temperature: 0.9, displayName: 'Custom' }
    const merged = mergeAiConfig(activityConfig, groupConfig)
    expect(merged.temperature).toBe(0.9)
    expect(merged.displayName).toBe('Custom')
    expect(merged.role).toBe('system_helper')
  })
})
