export const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-cyan-500',
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
    ? 'bg-purple-500'
    : isTeacher
      ? 'bg-amber-500'
      : getAvatarColor(senderName)
  const bubbleClass = isOwn
    ? 'bg-blue-500 text-white'
    : isAi
      ? 'bg-purple-100'
      : isTeacher
        ? 'bg-amber-50 border border-amber-300'
        : 'bg-gray-100'

  return (
    <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 mb-3`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold`}>
        {isAi ? '🤖' : isTeacher ? '👩‍🏫' : initial}
      </div>
      <div className={`max-w-[70%] ${bubbleClass} rounded-lg px-3 py-2`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold opacity-80">
            {senderName}
            {isAi && <span className="ml-1 px-1 bg-purple-200 text-purple-800 rounded text-[10px]">AI</span>}
            {isTeacher && <span className="ml-1 px-1 bg-amber-200 text-amber-800 rounded text-[10px]">Teacher</span>}
          </span>
          <span className="text-[10px] opacity-50">{time}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
