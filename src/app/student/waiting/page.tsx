'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Loader2 } from 'lucide-react'

export default function StudentWaitingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [status] = useState<string>('')

  useEffect(() => {
    const token = localStorage.getItem("student_token")
    const activityId = localStorage.getItem("activityId")
    if (!token || !activityId) { router.push('/student/join'); return }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    socket.on('connect', () => {
      socket.emit('join-waiting', activityId)
    })

    socket.on('connect_error', (err) => {
      console.error('[waiting] socket connect error:', err.message)
    })

    const student = JSON.parse(localStorage.getItem("student") || '{}')

    socket.on('activity-started', (data: { studentId: string; groupId: string }) => {
      if (data.studentId === student.id) {
        localStorage.setItem("groupId", data.groupId)
        router.push('/student/chat')
      }
    })

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/student/my-group', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.groupId) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      <Card className="text-center max-w-sm mx-4">
        <div className="flex justify-center mb-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
        <p className="text-lg font-medium text-slate-800">{status || t('student.waiting.title')}</p>
        <p className="text-sm text-slate-500 mt-2">{t('student.waiting.tip')}</p>
      </Card>
    </div>
  )
}
