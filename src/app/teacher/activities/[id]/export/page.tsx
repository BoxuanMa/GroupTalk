'use client'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

const EXPORT_TYPES = [
  { type: 'messages', labelKey: 'export.messages.label', descKey: 'export.messages.desc', format: 'CSV' },
  { type: 'ai-logs', labelKey: 'export.ai_logs.label', descKey: 'export.ai_logs.desc', format: 'JSON' },
  { type: 'activity-logs', labelKey: 'export.activity_logs.label', descKey: 'export.activity_logs.desc', format: 'CSV' },
  { type: 'concept-maps', labelKey: 'export.concept_maps.label', descKey: 'export.concept_maps.desc', format: 'JSON' },
  { type: 'conditions', labelKey: 'export.conditions.label', descKey: 'export.conditions.desc', format: 'CSV' },
]

export default function ExportPage() {
  const params = useParams()
  const { t } = useI18n()
  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null

  function handleDownload(type: string, format: string) {
    const url = `/api/activities/${params.id}/export?type=${type}`

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `${type}.${format === 'CSV' ? 'csv' : 'json'}`
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('export.title')}</h1>
        <LanguageSwitcher />
      </div>

      <div className="space-y-4">
        {EXPORT_TYPES.map((item) => (
          <Card key={item.type} className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{t(item.labelKey)}</h3>
              <p className="text-sm text-gray-500">{t(item.descKey)}</p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.format}</span>
            </div>
            <Button onClick={() => handleDownload(item.type, item.format)}>{t('common.download')}</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
