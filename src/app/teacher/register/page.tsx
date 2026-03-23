'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function TeacherRegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '注册失败')
      return
    }

    const data = await res.json()
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.teacher))
    router.push('/teacher/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">老师注册</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">注册</Button>
        </form>
      </Card>
    </div>
  )
}
