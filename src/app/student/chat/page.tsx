'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
const PdfViewer = dynamic(() => import('@/components/pdf-viewer').then((m) => m.PdfViewer), { ssr: false })
import { ChatPanel } from '@/components/chat-panel'

export default function StudentChatPage() {
  const router = useRouter()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activity, setActivity] = useState<{ pdfUrl: string } | null>(null)
  const [members, setMembers] = useState<Array<{ name: string }>>([])
  const [groupId, setGroupId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedGroupId = localStorage.getItem('groupId')
    const student = JSON.parse(localStorage.getItem('student') || '{}')

    if (!token || !storedGroupId) { router.push('/student/join'); return }

    setGroupId(storedGroupId)
    setCurrentUserId(student.id)

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    s.on('connect', () => {
      s.emit('join-group', storedGroupId)
    })

    s.on('error', (msg: string) => {
      if (msg === 'Discussion has ended') {
        alert('讨论已结束')
      }
    })

    setSocket(s)

    // Fetch activity info and group members via student API
    fetch('/api/student/my-group', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.activity) {
          setActivity({ pdfUrl: data.activity.pdfUrl })
          setMembers(data.members || [])
        }
      })

    return () => { s.disconnect() }
  }, [router])

  return (
    <div className="h-screen flex">
      <div className="w-1/2 border-r">
        {activity?.pdfUrl ? (
          <PdfViewer url={activity.pdfUrl} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">加载 PDF 中...</div>
        )}
      </div>
      <div className="w-1/2">
        <ChatPanel
          socket={socket}
          groupId={groupId}
          currentUserId={currentUserId}
          members={members}
        />
      </div>
    </div>
  )
}
