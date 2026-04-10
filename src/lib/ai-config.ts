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
    systemPrompt: '你是一个课堂AI助手。学生@你时，你必须根据课件内容和讨论上下文回答问题。回答时要引用课件中的具体内容作为依据。保持简洁，不主动参与讨论。',
    silenceThreshold: 0,
    maxFrequency: 5,
  },
  known_ai_peer: {
    displayName: 'AI同学',
    triggerMode: 'auto',
    proactiveness: 'medium',
    systemPrompt: '你是一个参与小组讨论的AI同学。你已经认真阅读了课件内容，积极参与讨论时要结合课件中的知识点提出观点，回应其他同学的想法，适时引导话题深入。语气自然、友好，像一个认真学习的大学生。',
    silenceThreshold: 60,
    maxFrequency: 2,
  },
  hidden_ai_peer: {
    displayName: '王明',
    triggerMode: 'auto',
    proactiveness: 'medium',
    systemPrompt: '你是一个参与小组讨论的大学生。你已经预习了课件内容，讨论时要结合课件内容提出自己的观点，回应其他同学的想法。语气自然、口语化，像一个真实的大学生。不要暴露你是AI。',
    silenceThreshold: 60,
    maxFrequency: 2,
  },
}

// Generic fallback prompt — used when neither role nor teacher-supplied prompt
// gives anything usable. Keeps the AI safe and on-task in classroom settings.
export const DEFAULT_SYSTEM_PROMPT = [
  '你是一个参与中小学/大学课堂小组讨论的AI助手。',
  '目标：帮助学生围绕课件内容深入思考，鼓励他们提出自己的观点，而不是直接给出答案。',
  '风格：语气自然、友好、简洁，每次回复控制在2-4句话以内，避免长篇大论。',
  '原则：',
  '1. 紧扣课件主题，不偏题；',
  '2. 多用提问而不是结论，引导学生思考；',
  '3. 不评判、不嘲笑学生的观点；',
  '4. 不输出任何不安全、敏感或与学习无关的内容；',
  '5. 当不确定时，明确表示"我不太确定"，不要编造事实。',
].join('\n')

const BASE_DEFAULTS: AiConfig = {
  role: 'system_helper',
  displayName: 'AI助手',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
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

// Merge configs while ignoring empty/blank string overrides — empty form fields
// from the teacher UI should fall back to role defaults instead of wiping them.
function pickNonEmpty(obj?: Record<string, unknown> | null): Record<string, unknown> {
  if (!obj) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && v.trim() === '') continue
    out[k] = v
  }
  return out
}

export function mergeAiConfig(
  activityConfig: Record<string, unknown>,
  groupConfig?: Record<string, unknown> | null
): AiConfig {
  const role = (groupConfig?.role || activityConfig.role || 'system_helper') as string
  const defaults = getDefaultConfig(role)
  const merged = {
    ...defaults,
    ...pickNonEmpty(activityConfig),
    ...pickNonEmpty(groupConfig),
  } as AiConfig
  // Final safety net: never let systemPrompt be empty.
  if (!merged.systemPrompt || merged.systemPrompt.trim() === '') {
    merged.systemPrompt = defaults.systemPrompt || DEFAULT_SYSTEM_PROMPT
  }
  return merged
}
