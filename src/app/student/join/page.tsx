'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { UserPlus } from 'lucide-react'

export default function StudentJoinPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [joinCode, setJoinCode] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="max-w-sm w-full mx-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t('student.join.title')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('student.join.code')}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
            className="font-mono tracking-wider uppercase"
            autoComplete="off"
          />
          <Input
            label={t('student.join.student_number')}
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
            required
          />
          <Input
            label={t('student.join.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>}
          <Button type="submit" variant="success" className="w-full" size="lg" disabled={loading}>
            {loading ? t('common.loading') : t('student.join.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
