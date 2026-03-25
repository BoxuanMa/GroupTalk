'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '登录失败')
      return
    }

    const data = await res.json()
    localStorage.setItem('teacher_token', data.token)
    localStorage.setItem('user', JSON.stringify(data.teacher))
    router.push('/teacher/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">老师登录</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">登录</Button>
          <p className="text-sm text-center text-gray-500">
            没有账号？<Link href="/teacher/register" className="text-blue-600">注册</Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
