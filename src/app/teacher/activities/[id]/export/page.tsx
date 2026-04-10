'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ArrowLeft, Download, MessageSquare, Bot, Activity, GitBranch, Beaker } from 'lucide-react'

const EXPORT_TYPES = [
  { type: 'messages', labelKey: 'export.messages.label', descKey: 'export.messages.desc', format: 'CSV', icon: MessageSquare },
  { type: 'ai-logs', labelKey: 'export.ai_logs.label', descKey: 'export.ai_logs.desc', format: 'JSON', icon: Bot },
  { type: 'activity-logs', labelKey: 'export.activity_logs.label', descKey: 'export.activity_logs.desc', format: 'CSV', icon: Activity },
  { type: 'concept-maps', labelKey: 'export.concept_maps.label', descKey: 'export.concept_maps.desc', format: 'JSON', icon: GitBranch },
  { type: 'conditions', labelKey: 'export.conditions.label', descKey: 'export.conditions.desc', format: 'CSV', icon: Beaker },
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/teacher/activities/${params.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('export.title')}</h1>

        <div className="space-y-3">
          {EXPORT_TYPES.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.type} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{t(item.labelKey)}</h3>
                  <p className="text-sm text-slate-500">{t(item.descKey)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">{item.format}</span>
                  <Button size="sm" onClick={() => handleDownload(item.type, item.format)}>
                    <Download className="w-3.5 h-3.5" />
                    {t('common.download')}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
