'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function TeacherRegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
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
      setError(data.error || t('teacher.register.failed'))
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{t('teacher.register.title')}</h2>
          <LanguageSwitcher />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder={t('teacher.login.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder={t('teacher.register.name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="password" placeholder={t('teacher.login.password')} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{t('teacher.register.submit')}</Button>
        </form>
      </Card>
    </div>
  )
}
