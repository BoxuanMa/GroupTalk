'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function StudentJoinPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinCode: joinCode.toUpperCase(), studentNumber, name }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '加入失败')
      return
    }

    const data = await res.json()
    sessionStorage.setItem('student_token', data.token)
    sessionStorage.setItem('student', JSON.stringify(data.student))
    sessionStorage.setItem('activityId', data.activityId)
    router.push('/student/waiting')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">加入活动</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="活动码" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
          <Input placeholder="学号" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} required />
          <Input placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">加入</Button>
        </form>
      </Card>
    </div>
  )
}
