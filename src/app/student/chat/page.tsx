'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
const PdfViewer = dynamic(() => import('@/components/pdf-viewer').then((m) => m.PdfViewer), { ssr: false })
import { ChatPanel } from '@/components/chat-panel'

export default function StudentChatPage() {
  const router = useRouter()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activity, setActivity] = useState<{ pdfUrl: string } | null>(null)
  const [members, setMembers] = useState<Array<{ name: string; type?: 'student' | 'ai' }>>([])
  const [groupId, setGroupId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('student_token')
    const storedGroupId = sessionStorage.getItem('groupId')
    const student = JSON.parse(sessionStorage.getItem('student') || '{}')

    if (!token || !storedGroupId) { router.push('/student/join'); return }

    setGroupId(storedGroupId)
    setCurrentUserId(student.id)

    // Avoid creating duplicate sockets on React StrictMode double-mount
    if (socketRef.current) {
      setSocket(socketRef.current)
      return
    }

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

    socketRef.current = s
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

    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [router])

  return (
    <div className="h-screen flex">
      <div className="w-1/2 border-r">
        {activity?.pdfUrl ? (
          <PdfViewer url={activity.pdfUrl} />
        ) : activity === null ? (
          <div className="flex items-center justify-center h-full text-gray-400">加载中...</div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">未上传 PDF 课件</div>
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
