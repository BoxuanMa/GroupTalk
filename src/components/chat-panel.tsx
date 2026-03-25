'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChatMessage, getAvatarColor } from '@/components/chat-message'

interface Message {
  id: string
  senderId: string | null
  senderType: 'student' | 'ai'
  senderName: string
  content: string
  timestamp: string
}

interface Member {
  name: string
  type?: 'student' | 'ai'
}

interface ChatPanelProps {
  socket: Socket | null
  groupId: string
  currentUserId: string
  members: Array<Member>
}

export function ChatPanel({ socket, groupId, currentUserId, members }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showMention, setShowMention] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    if (!groupId) return
    const token = sessionStorage.getItem('student_token') || localStorage.getItem('teacher_token')
    fetch(`/api/messages/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
  }, [groupId])

  useEffect(() => {
    if (!socket) return

    socket.on('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg])
      // Clear typing for this sender
      setTypingUsers((prev) => {
        const next = new Map(prev)
        if (msg.senderId) next.delete(msg.senderId)
        if (msg.senderType === 'ai') next.delete('ai')
        return next
      })
    })

    socket.on('user-typing', (data: { userId: string; name: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev)
        if (data.isTyping) {
          next.set(data.userId, data.name)
        } else {
          next.delete(data.userId)
        }
        return next
      })
    })

    return () => {
      socket.off('new-message')
      socket.off('user-typing')
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // Emit typing status with debounce
  const emitTyping = useCallback((typing: boolean) => {
    if (!socket) return
    if (typing === isTypingRef.current) return
    isTypingRef.current = typing
    socket.emit('typing', typing)
  }, [socket])

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInput(val)

    // Emit typing
    if (val.trim()) {
      emitTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000)
    } else {
      emitTyping(false)
    }

    // Check if user is typing @
    const cursorPos = e.target.selectionStart || val.length
    const textBeforeCursor = val.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([^@\s]*)$/)

    if (atMatch) {
      setShowMention(true)
      setMentionFilter(atMatch[1])
      setMentionIndex(0)
    } else {
      setShowMention(false)
    }
  }

  function insertMention(name: string) {
    const cursorPos = inputRef.current?.selectionStart || input.length
    const textBeforeCursor = input.slice(0, cursorPos)
    const textAfterCursor = input.slice(cursorPos)
    const newBefore = textBeforeCursor.replace(/@[^@\s]*$/, `@${name} `)
    setInput(newBefore + textAfterCursor)
    setShowMention(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showMention && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[mentionIndex].name)
        return
      }
      if (e.key === 'Escape') {
        setShowMention(false)
        return
      }
    }

    if (e.key === 'Enter' && !showMention) {
      handleSend()
    }
  }

  function handleSend() {
    if (!input.trim() || !socket) return
    socket.emit('send-message', { content: input.trim() })
    setInput('')
    setShowMention(false)
    emitTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
  }

  const typingNames = Array.from(typingUsers.values())

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b bg-gray-50 flex items-center gap-3">
        <span className="text-sm text-gray-500">成员:</span>
        {members.map((m) => (
          <div key={m.name} className="flex items-center gap-1">
            <div className={`w-6 h-6 rounded-full ${m.type === 'ai' ? 'bg-purple-500' : getAvatarColor(m.name)} flex items-center justify-center text-white text-xs font-bold`}>
              {m.type === 'ai' ? '🤖' : m.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm">{m.name}</span>
            {m.type === 'ai' && <span className="px-1 bg-purple-100 text-purple-700 rounded text-[10px]">AI</span>}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            senderName={msg.senderName}
            senderType={msg.senderType}
            content={msg.content}
            timestamp={msg.timestamp}
            isOwn={msg.senderId === currentUserId}
          />
        ))}

        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-1">
              {typingNames.map((name) => (
                <div key={name} className={`w-6 h-6 rounded-full ${getAvatarColor(name)} flex items-center justify-center text-white text-[10px] font-bold border-2 border-white`}>
                  {name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-1">
              <span className="text-sm text-gray-500">
                {typingNames.join('、')} 正在输入
              </span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="relative p-3 border-t">
        {showMention && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-10">
            {filteredMembers.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${i === mentionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m.name) }}
              >
                <div className={`w-5 h-5 rounded-full ${m.type === 'ai' ? 'bg-purple-500' : getAvatarColor(m.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {m.type === 'ai' ? '🤖' : m.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm">{m.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... 输入 @ 提及成员"
          />
          <Button onClick={handleSend}>发送</Button>
        </div>
      </div>
    </div>
  )
}
