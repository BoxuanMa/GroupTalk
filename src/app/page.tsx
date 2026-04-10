'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function HomePage() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t('home.title')}</h1>
          <p className="text-gray-500 mt-2">{t('home.subtitle')}</p>
        </div>
        <Card>
          <div className="space-y-4">
            <Link href="/teacher/login">
              <Button className="w-full">{t('home.teacher_entry')}</Button>
            </Link>
            <Link href="/student/join">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                {t('home.student_entry')}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
