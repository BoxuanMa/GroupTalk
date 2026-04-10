'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ArrowLeft, Copy, FileText, Upload, RefreshCw, Users, Play, Square, Map, Download, MessageSquare } from 'lucide-react'

interface Student { id: string; studentNumber: string; name: string }
interface GroupMember { student: Student }
interface Group { id: string; groupNumber: number; aiRole: string; members: GroupMember[]; _count?: { messages: number } }
interface Activity {
  id: string; title: string; joinCode: string; status: string; pdfFileName: string | null
  students: Student[]
  groups: Group[]
}

const statusStyles: Record<string, { bg: string; dot: string }> = {
  draft: { bg: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' },
  waiting: { bg: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  active: { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  ended: { bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-400' },
}

export default function ActivityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)

  const statusLabels: Record<string, string> = {
    draft: t('teacher.dashboard.status.draft'),
    waiting: t('teacher.dashboard.status.waiting'),
    active: t('teacher.dashboard.status.active'),
    ended: t('teacher.dashboard.status.ended'),
  }
  const aiRoleLabels: Record<string, string> = {
    system_helper: t('activity.ai_role.system_helper'),
    known_ai_peer: t('activity.ai_role.known_ai_peer'),
    hidden_ai_peer: t('activity.ai_role.hidden_ai_peer'),
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null

  async function loadActivity() {
    const res = await fetch(`/api/activities/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setActivity(data.activity)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadActivity() }, [params.id])

  async function handleStartGrouping() {
    await fetch(`/api/activities/${params.id}/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    router.push(`/teacher/activities/${params.id}/groups`)
  }

  async function handleEndDiscussion() {
    if (!confirm(t('activity.end_confirm'))) return
    await fetch(`/api/activities/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'ended' }),
    })
    loadActivity()
  }

  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('pdf', file)
    await fetch(`/api/activities/${params.id}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    setUploading(false)
    loadActivity()
  }

  function handleCopyCode() {
    if (!activity) return
    navigator.clipboard.writeText(activity.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!activity) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/teacher/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <div className="flex-1" />
          <LanguageSwitcher />
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusStyles[activity.status]?.bg || 'bg-slate-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[activity.status]?.dot || 'bg-slate-400'}`} />
            {statusLabels[activity.status] || activity.status}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{activity.title}</h1>

        {/* Join Code */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">{t('activity.code_label')}</h3>
          <div className="flex items-center gap-3">
            <p className="text-4xl font-mono font-bold tracking-[0.2em] text-indigo-600">{activity.joinCode}</p>
            <button
              onClick={handleCopyCode}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Copy join code"
            >
              <Copy className="w-5 h-5" />
            </button>
            {copied && <span className="text-sm text-emerald-600 font-medium">Copied!</span>}
          </div>
          <p className="text-sm text-slate-500 mt-2">{t('activity.share_tip')}</p>
        </Card>

        {/* PDF */}
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">{t('activity.pdf_label')}</h3>
          {activity.pdfFileName ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span className="text-sm text-slate-700">{activity.pdfFileName}</span>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-400 mb-3">{t('activity.pdf_none')}</p>
              <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                <Upload className="w-4 h-4" />
                {uploading ? t('activity.uploading') : t('activity.upload_pdf')}
                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} disabled={uploading} />
              </label>
            </div>
          )}
        </Card>

        {/* Students */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700">{t('activity.joined_students_n', { n: activity.students.length })}</h3>
            {activity.status === 'waiting' && (
              <Button variant="secondary" size="sm" onClick={loadActivity}>
                <RefreshCw className="w-3.5 h-3.5" />
                {t('common.refresh')}
              </Button>
            )}
          </div>
          {activity.students.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activity.students.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.studentNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">{t('activity.no_students')}</p>
            </div>
          )}
        </Card>

        {/* Groups */}
        {activity.groups.length > 0 && (
          <Card>
            <h3 className="font-semibold text-slate-700 mb-4">{t('activity.groups_n', { n: activity.groups.length })}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activity.groups.map((g) => (
                <Link
                  key={g.id}
                  href={`/teacher/activities/${params.id}/groups/${g.id}/chat`}
                  className="block p-4 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all bg-white"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-slate-800">{t('activity.group_n', { n: g.groupNumber })}</span>
                    <span className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium">
                      {aiRoleLabels[g.aiRole] || g.aiRole}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {g.members.map((m) => m.student.name).join(', ')}
                  </div>
                  {g._count?.messages !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                      <MessageSquare className="w-3 h-3" />
                      {t('activity.messages_n', { n: g._count.messages })}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {activity.status === 'waiting' && (
            <Button onClick={handleStartGrouping} disabled={activity.students.length < 2} size="lg">
              <Play className="w-4 h-4" />
              {t('activity.start_grouping_n', { n: activity.students.length })}
            </Button>
          )}

          {activity.status === 'active' && (
            <>
              <Link href={`/teacher/activities/${params.id}/groups`}>
                <Button size="lg">
                  <Users className="w-4 h-4" />
                  {t('activity.manage_groups')}
                </Button>
              </Link>
              <Button onClick={handleEndDiscussion} variant="danger" size="lg">
                <Square className="w-4 h-4" />
                {t('activity.end_discussion')}
              </Button>
            </>
          )}

          {activity.status === 'ended' && (
            <>
              <Link href={`/teacher/activities/${params.id}/concept-maps`}>
                <Button size="lg">
                  <Map className="w-4 h-4" />
                  {t('activity.view_concept_maps')}
                </Button>
              </Link>
              <Link href={`/teacher/activities/${params.id}/export`}>
                <Button variant="secondary" size="lg">
                  <Download className="w-4 h-4" />
                  {t('activity.export_data')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
