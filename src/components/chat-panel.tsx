'use client'
import { useState, useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChatMessage } from '@/components/chat-message'

interface Message {
  id: string
  senderId: string | null
  senderType: 'student' | 'ai'
  senderName: string
  content: string
  timestamp: string
}

interface ChatPanelProps {
  socket: Socket | null
  groupId: string
  currentUserId: string
  members: Array<{ name: string }>
}

export function ChatPanel({ socket, groupId, currentUserId, members }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
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
    })

    return () => { socket.off('new-message') }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim() || !socket) return
    socket.emit('send-message', { content: input.trim() })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b bg-gray-50 text-sm">
        成员: {members.map((m) => m.name).join(', ')}
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
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
        />
        <Button onClick={handleSend}>发送</Button>
      </div>
    </div>
  )
}
