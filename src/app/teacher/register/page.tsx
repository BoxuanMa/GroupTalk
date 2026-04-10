'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { UserPlus } from 'lucide-react'

export default function TeacherRegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || t('teacher.register.failed'))
        return
      }

      const data = await res.json()
      localStorage.setItem('teacher_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.teacher))
      router.push('/teacher/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="max-w-sm w-full mx-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{t('teacher.register.title')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('teacher.register.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label={t('teacher.register.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={t('teacher.register.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg" role="alert">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t('common.loading') : t('teacher.register.submit')}
          </Button>
          <p className="text-sm text-center text-slate-500">
            {t('teacher.register.has_account')}{' '}
            <Link href="/teacher/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              {t('teacher.register.go_login')}
            </Link>
          </p>
        </form>
      </Card>
    </div>
  )
}
