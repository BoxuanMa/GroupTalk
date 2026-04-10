'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AiConfigForm } from '@/components/ai-config-form'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ArrowLeft, Upload, Rocket } from 'lucide-react'

export default function NewActivityPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [aiConfig, setAiConfig] = useState<Record<string, unknown>>({ role: 'system_helper' })
  const [groupMin, setGroupMin] = useState(2)
  const [groupMax, setGroupMax] = useState(4)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const token = localStorage.getItem('teacher_token')

    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    })
    const { activity } = await res.json()

    if (pdf) {
      const formData = new FormData()
      formData.append('pdf', pdf)
      await fetch(`/api/activities/${activity.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
    }

    await fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        aiConfig,
        groupSize: { min: groupMin, max: groupMax },
        status: 'waiting',
      }),
    })

    router.push(`/teacher/activities/${activity.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{t('new.title')}</h1>
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-3">{t('new.basic_info')}</h3>
            <Input label={t('new.activity_title')} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-3">{t('new.upload_pdf_title')}</h3>
            <label className="flex items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-sm text-slate-500">{pdf ? pdf.name : 'Click to upload PDF'}</span>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdf(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-3">{t('new.group_settings')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('new.group_min')}
                type="number"
                min={2}
                max={4}
                value={groupMin}
                onChange={(e) => setGroupMin(Number(e.target.value))}
              />
              <Input
                label={t('new.group_max')}
                type="number"
                min={2}
                max={4}
                value={groupMax}
                onChange={(e) => setGroupMax(Number(e.target.value))}
              />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-700 mb-3">{t('new.ai_settings')}</h3>
            <AiConfigForm value={aiConfig} onChange={setAiConfig} />
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading || !title}>
            <Rocket className="w-4 h-4" />
            {loading ? t('new.creating') : t('new.create_button')}
          </Button>
        </form>
      </div>
    </div>
  )
}
