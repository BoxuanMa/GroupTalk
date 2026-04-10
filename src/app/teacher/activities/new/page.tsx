'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AiConfigForm } from '@/components/ai-config-form'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

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

    // 1. Create activity
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    })
    const { activity } = await res.json()

    // 2. Upload PDF
    if (pdf) {
      const formData = new FormData()
      formData.append('pdf', pdf)
      await fetch(`/api/activities/${activity.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
    }

    // 3. Update AI config and group size
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
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('new.title')}</h1>
        <LanguageSwitcher />
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="font-semibold mb-3">{t('new.basic_info')}</h3>
          <Input placeholder={t('new.activity_title')} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">{t('new.upload_pdf_title')}</h3>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdf(e.target.files?.[0] || null)}
            className="w-full"
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">{t('new.group_settings')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('new.group_min')}</label>
              <Input type="number" min={2} max={4} value={groupMin} onChange={(e) => setGroupMin(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('new.group_max')}</label>
              <Input type="number" min={2} max={4} value={groupMax} onChange={(e) => setGroupMax(Number(e.target.value))} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-3">{t('new.ai_settings')}</h3>
          <AiConfigForm value={aiConfig} onChange={setAiConfig} />
        </Card>

        <Button type="submit" className="w-full" disabled={loading || !title}>
          {loading ? t('new.creating') : t('new.create_button')}
        </Button>
      </form>
    </div>
  )
}
