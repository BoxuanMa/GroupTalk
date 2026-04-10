'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function StudentJoinPage() {
  const router = useRouter()
  const { t } = useI18n()
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
      const data = await res.json().catch(() => ({}))
      setError(data.error || t('student.join.failed'))
      return
    }

    const data = await res.json()
    localStorage.setItem('student_token', data.token)
    localStorage.setItem('student', JSON.stringify(data.student))
    localStorage.setItem('activityId', data.activityId)
    router.push(data.status === 'active' ? '/student/chat' : '/student/waiting')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">{t('student.join.title')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder={t('student.join.code')}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          <Input
            placeholder={t('student.join.student_number')}
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            required
          />
          <Input
            placeholder={t('student.join.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
            {t('student.join.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
