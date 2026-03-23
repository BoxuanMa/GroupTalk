export interface AiConfig {
  role: string
  displayName: string
  systemPrompt: string
  proactiveness: 'low' | 'medium' | 'high'
  triggerMode: 'mention_only' | 'auto' | 'hybrid'
  silenceThreshold: number
  maxFrequency: number
  temperature: number
  model: string
}

const DEFAULTS: Record<string, Partial<AiConfig>> = {
  system_helper: {
    displayName: 'AI助手',
    triggerMode: 'mention_only',
    proactiveness: 'low',
    systemPrompt: '你是一个课堂AI助手。学生@你时，根据课件内容和讨论上下文回答问题。保持简洁，不主动参与讨论。',
    silenceThreshold: 0,
    maxFrequency: 5,
  },
  known_ai_peer: {
    displayName: 'AI同学',
    triggerMode: 'auto',
    proactiveness: 'medium',
    systemPrompt: '你是一个参与小组讨论的AI同学。积极参与讨论，提出观点，回应其他同学的想法，适时引导话题深入。语气自然、友好，像一个认真学习的大学生。',
    silenceThreshold: 60,
    maxFrequency: 2,
  },
  hidden_ai_peer: {
    displayName: '王明',
    triggerMode: 'auto',
    proactiveness: 'medium',
    systemPrompt: '你是一个参与小组讨论的大学生。积极参与讨论，提出观点，回应其他同学的想法。语气自然、口语化，像一个真实的大学生。不要暴露你是AI。',
    silenceThreshold: 60,
    maxFrequency: 2,
  },
}

const BASE_DEFAULTS: AiConfig = {
  role: 'system_helper',
  displayName: 'AI助手',
  systemPrompt: '',
  proactiveness: 'medium',
  triggerMode: 'mention_only',
  silenceThreshold: 60,
  maxFrequency: 2,
  temperature: 0.7,
  model: 'gpt-4o',
}

export function getDefaultConfig(role: string): AiConfig {
  return { ...BASE_DEFAULTS, ...DEFAULTS[role], role }
}

export function mergeAiConfig(
  activityConfig: Record<string, unknown>,
  groupConfig?: Record<string, unknown> | null
): AiConfig {
  const role = (groupConfig?.role || activityConfig.role || 'system_helper') as string
  const defaults = getDefaultConfig(role)
  return { ...defaults, ...activityConfig, ...(groupConfig || {}) } as AiConfig
}
