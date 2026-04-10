'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { GraduationCap, Users } from 'lucide-react'

export default function HomePage() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-sm w-full space-y-8 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{t('home.title')}</h1>
          <p className="text-slate-500 mt-2 text-balance">{t('home.subtitle')}</p>
        </div>
        <Card className="space-y-3">
          <Link href="/teacher/login" className="block">
            <Button className="w-full" size="lg">
              <GraduationCap className="w-5 h-5" />
              {t('home.teacher_entry')}
            </Button>
          </Link>
          <Link href="/student/join" className="block">
            <Button variant="success" className="w-full" size="lg">
              <Users className="w-5 h-5" />
              {t('home.student_entry')}
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}
