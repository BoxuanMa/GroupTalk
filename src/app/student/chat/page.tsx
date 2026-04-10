'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
const PdfViewer = dynamic(() => import('@/components/pdf-viewer').then((m) => m.PdfViewer), { ssr: false })
import { ChatPanel } from '@/components/chat-panel'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function StudentChatPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [activity, setActivity] = useState<{ pdfUrl: string } | null>(null)
  const [members, setMembers] = useState<Array<{ name: string; type?: 'student' | 'ai' }>>([])
  const [groupId, setGroupId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("student_token")
    const student = JSON.parse(localStorage.getItem("student") || '{}')

    if (!token) { router.push('/student/join'); return }

    setCurrentUserId(student.id)

    // Avoid creating duplicate sockets on React StrictMode double-mount
    if (socketRef.current) {
      setSocket(socketRef.current)
      return
    }

    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    let resolvedGroupId = localStorage.getItem("groupId") || ''
    if (resolvedGroupId) setGroupId(resolvedGroupId)

    s.on('connect', () => {
      if (resolvedGroupId) s.emit('join-group', resolvedGroupId)
    })

    s.on('error', (msg: string) => {
      if (msg === 'Discussion has ended') {
        alert(t('student.chat.ended_alert'))
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
        // Recover groupId if missing (e.g., reopened tab)
        if (data.groupId && !resolvedGroupId) {
          resolvedGroupId = data.groupId
          localStorage.setItem('groupId', data.groupId)
          setGroupId(data.groupId)
          if (s.connected) s.emit('join-group', data.groupId)
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
          <div className="flex items-center justify-center h-full text-gray-400">{t('common.loading')}</div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">{t('student.chat.no_pdf')}</div>
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
