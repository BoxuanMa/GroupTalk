'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { Card } from '@/components/ui/card'

export default function StudentWaitingPage() {
  const router = useRouter()
  const [status] = useState('等待老师开始活动...')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const activityId = localStorage.getItem('activityId')
    if (!token || !activityId) { router.push('/student/join'); return }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })

    socket.emit('join-waiting', activityId)

    const student = JSON.parse(localStorage.getItem('student') || '{}')
    socket.on('activity-started', (data: { studentId: string; groupId: string }) => {
      if (data.studentId === student.id) {
        localStorage.setItem('groupId', data.groupId)
        router.push('/student/chat')
      }
    })

    return () => { socket.disconnect() }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="text-center">
        <div className="animate-pulse text-4xl mb-4">...</div>
        <p className="text-lg">{status}</p>
        <p className="text-sm text-gray-400 mt-2">老师开始活动后会自动跳转</p>
      </Card>
    </div>
  )
}
