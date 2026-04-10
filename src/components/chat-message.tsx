import { Bot, GraduationCap } from 'lucide-react'

export const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-cyan-500',
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface ChatMessageProps {
  senderName: string
  senderType: 'student' | 'ai' | 'teacher'
  content: string
  timestamp: string
  isOwn: boolean
}

export function ChatMessage({ senderName, senderType, content, timestamp, isOwn }: ChatMessageProps) {
  const isAi = senderType === 'ai'
  const isTeacher = senderType === 'teacher'
  const time = new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const initial = senderName.charAt(0).toUpperCase()
  const avatarColor = isAi
    ? 'bg-violet-500'
    : isTeacher
      ? 'bg-orange-500'
      : getAvatarColor(senderName)
  const bubbleClass = isOwn
    ? 'bg-indigo-600 text-white'
    : isAi
      ? 'bg-violet-50 border border-violet-200'
      : isTeacher
        ? 'bg-orange-50 border border-orange-200'
        : 'bg-white border border-slate-200'

  return (
    <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start gap-2.5 mb-4`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
        {isAi ? <Bot className="w-4 h-4" /> : isTeacher ? <GraduationCap className="w-4 h-4" /> : initial}
      </div>
      <div className={`max-w-[70%] ${bubbleClass} rounded-2xl ${isOwn ? 'rounded-tr-md' : 'rounded-tl-md'} px-3.5 py-2.5`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-semibold ${isOwn ? 'text-indigo-200' : 'text-slate-600'}`}>
            {senderName}
            {isAi && <span className="ml-1.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-medium">AI</span>}
            {isTeacher && <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">Teacher</span>}
          </span>
          <span className={`text-[10px] ${isOwn ? 'text-indigo-300' : 'text-slate-400'}`}>{time}</span>
        </div>
        <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isOwn ? '' : 'text-slate-800'}`}>{content}</p>
      </div>
    </div>
  )
}
