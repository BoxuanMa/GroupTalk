'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function StudentWaitingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [status] = useState<string>('')

  useEffect(() => {
    const token = localStorage.getItem("student_token")
    const activityId = localStorage.getItem("activityId")
    if (!token || !activityId) { router.push('/student/join'); return }

    console.log('[waiting] token:', token?.substring(0, 20) + '...', 'activityId:', activityId)

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    socket.on('connect', () => {
      console.log('[waiting] socket connected, joining waiting room:', activityId)
      socket.emit('join-waiting', activityId)
    })

    socket.on('connect_error', (err) => {
      console.error('[waiting] socket connect error:', err.message)
    })

    const student = JSON.parse(localStorage.getItem("student") || '{}')
    console.log('[waiting] student:', student)

    socket.on('activity-started', (data: { studentId: string; groupId: string }) => {
      console.log('[waiting] activity-started received:', data, 'my id:', student.id)
      if (data.studentId === student.id) {
        localStorage.setItem("groupId", data.groupId)
        router.push('/student/chat')
      }
    })

    // Fallback: poll API every 5s to check if assigned to a group
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/student/my-group', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.groupId) {
            console.log('[waiting] poll found group:', data.groupId)
            localStorage.setItem("groupId", data.groupId)
            router.push('/student/chat')
          }
        }
      } catch { /* ignore */ }
    }, 5000)

    return () => {
      socket.disconnect()
      clearInterval(pollInterval)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="text-center">
        <div className="animate-pulse text-4xl mb-4">...</div>
        <p className="text-lg">{status || t('student.waiting.title')}</p>
        <p className="text-sm text-gray-400 mt-2">{t('student.waiting.tip')}</p>
      </Card>
    </div>
  )
}
