interface ChatMessageProps {
  senderName: string
  senderType: 'student' | 'ai'
  content: string
  timestamp: string
  isOwn: boolean
}

export function ChatMessage({ senderName, senderType, content, timestamp, isOwn }: ChatMessageProps) {
  const isAi = senderType === 'ai'
  const time = new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] ${isOwn ? 'bg-blue-500 text-white' : isAi ? 'bg-purple-100' : 'bg-gray-100'} rounded-lg px-3 py-2`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold opacity-80">
            {senderName}
            {isAi && <span className="ml-1 px-1 bg-purple-200 text-purple-800 rounded text-[10px]">AI</span>}
          </span>
          <span className="text-[10px] opacity-50">{time}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
