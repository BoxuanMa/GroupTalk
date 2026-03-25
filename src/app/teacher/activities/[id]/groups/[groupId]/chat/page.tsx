'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChatMessage } from '@/components/chat-message'

interface Message {
  id: string
  senderId: string | null
  senderType: 'student' | 'ai'
  senderName: string
  content: string
  timestamp: string
}

interface GroupInfo {
  groupNumber: number
  members: Array<{ student: { name: string } }>
}

export default function GroupChatHistoryPage() {
  const params = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [group, setGroup] = useState<GroupInfo | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null

  useEffect(() => {
    if (!params.groupId || !token) return

    // Load messages
    fetch(`/api/messages/${params.groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))

    // Load group info
    fetch(`/api/activities/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const g = data.activity?.groups?.find((g: { id: string }) => g.id === params.groupId)
        if (g) setGroup(g)
      })
  }, [params.groupId, params.id, token])

  return (
    <div className="h-screen flex flex-col">
      <div className="p-3 border-b bg-white flex items-center gap-3">
        <Link href={`/teacher/activities/${params.id}`} className="text-gray-400 hover:text-gray-600 transition">
          ← 返回
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">
            第 {group?.groupNumber || '?'} 组 聊天记录
          </h1>
          {group && (
            <p className="text-xs text-gray-500">
              成员: {group.members.map((m) => m.student.name).join('、')}
            </p>
          )}
        </div>
        <span className="text-sm text-gray-400">{messages.length} 条消息</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 py-12">暂无消息</p>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              senderName={msg.senderName}
              senderType={msg.senderType}
              content={msg.content}
              timestamp={msg.timestamp}
              isOwn={false}
            />
          ))
        )}
      </div>
    </div>
  )
}
