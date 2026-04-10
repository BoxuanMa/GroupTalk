'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { ChatMessage, getAvatarColor } from '@/components/chat-message'
import { Send, Bot, GraduationCap } from 'lucide-react'

interface Message {
  id: string
  senderId: string | null
  senderType: 'student' | 'ai' | 'teacher'
  senderName: string
  content: string
  timestamp: string
}

interface Member {
  id?: string
  name: string
  type?: 'student' | 'ai' | 'teacher'
}

interface ChatPanelProps {
  socket: Socket | null
  groupId: string
  currentUserId: string
  members: Array<Member>
}

export function ChatPanel({ socket, groupId, currentUserId, members: initialMembers }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [teachers, setTeachers] = useState<Map<string, string>>(new Map())
  const members: Member[] = [
    ...initialMembers,
    ...Array.from(teachers.entries()).map(([id, name]) => ({
      id,
      name,
      type: 'teacher' as const,
    })),
  ]
  const [input, setInput] = useState('')
  const [showMention, setShowMention] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    if (!groupId) return
    const token = localStorage.getItem("student_token") || localStorage.getItem('teacher_token')
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
      setTypingUsers((prev) => {
        const next = new Map(prev)
        if (msg.senderId) next.delete(msg.senderId)
        if (msg.senderType === 'ai') next.delete('ai')
        return next
      })
    })

    socket.on('teacher-roster', (list: Array<{ id: string; name: string }>) => {
      setTeachers(new Map(list.map((t) => [t.id, t.name])))
    })

    socket.on('teacher-joined', (data: { id: string; name: string }) => {
      setTeachers((prev) => {
        const next = new Map(prev)
        next.set(data.id, data.name)
        return next
      })
    })

    socket.on('teacher-left', (data: { id: string }) => {
      setTeachers((prev) => {
        const next = new Map(prev)
        next.delete(data.id)
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
      socket.off('teacher-roster')
      socket.off('teacher-joined')
      socket.off('teacher-left')
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  const emitTyping = useCallback((typing: boolean) => {
    if (!socket) return
    if (typing === isTypingRef.current) return
    isTypingRef.current = typing
    socket.emit('typing', typing)
  }, [socket])

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)

    if (val.trim()) {
      emitTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000)
    } else {
      emitTyping(false)
    }

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
    // Ignore Enter during IME composition (e.g. Chinese input confirming candidate)
    if (e.nativeEvent.isComposing) return

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
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        handleSend()
      }
      // Plain Enter = newline (default textarea behavior)
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
    <div className="flex flex-col h-full bg-white">
      {/* Members bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3 overflow-x-auto">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">Members</span>
        <div className="flex items-center gap-2.5">
          {members.map((m) => (
            <div key={`${m.type ?? 'student'}-${m.id ?? m.name}`} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full ${
                m.type === 'ai'
                  ? 'bg-violet-500'
                  : m.type === 'teacher'
                    ? 'bg-orange-500'
                    : getAvatarColor(m.name)
              } flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>
                {m.type === 'ai' ? <Bot className="w-3 h-3" /> : m.type === 'teacher' ? <GraduationCap className="w-3 h-3" /> : m.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-700 whitespace-nowrap">{m.name}</span>
              {m.type === 'ai' && <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-medium">AI</span>}
              {m.type === 'teacher' && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">Teacher</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/30">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Send className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
          </div>
        )}
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
                <div key={name} className={`w-6 h-6 rounded-full ${getAvatarColor(name)} flex items-center justify-center text-white text-[10px] font-bold border-2 border-white shadow-sm`}>
                  {name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-sm text-slate-500">
                {typingNames.join(', ')}
              </span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="relative p-3 border-t border-slate-100 bg-white">
        {showMention && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 min-w-[180px] z-10">
            {filteredMembers.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${i === mentionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m.name) }}
              >
                <div className={`w-5 h-5 rounded-full ${m.type === 'ai' ? 'bg-violet-500' : m.type === 'teacher' ? 'bg-orange-500' : getAvatarColor(m.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                  {m.type === 'ai' ? <Bot className="w-2.5 h-2.5" /> : m.type === 'teacher' ? <GraduationCap className="w-2.5 h-2.5" /> : m.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-slate-700">{m.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... Use @ to mention (Ctrl+Enter to send)"
            rows={1}
            className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm
              transition-colors duration-150 resize-none
              placeholder:text-slate-400
              hover:border-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="rounded-xl px-3 flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
