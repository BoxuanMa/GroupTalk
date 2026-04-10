'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

interface Student { id: string; studentNumber: string; name: string }
interface GroupMember { student: Student }
interface Group { id: string; groupNumber: number; aiRole: string; members: GroupMember[]; _count?: { messages: number } }
interface Activity {
  id: string; title: string; joinCode: string; status: string; pdfFileName: string | null
  students: Student[]
  groups: Group[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  waiting: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-blue-100 text-blue-700',
}

export default function ActivityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [uploading, setUploading] = useState(false)

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

  if (!activity) return <div className="p-6">{t('common.loading')}</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teacher/dashboard" className="text-gray-400 hover:text-gray-600 transition">
          ← {t('common.back')}
        </Link>
        <div className="flex-1" />
        <LanguageSwitcher />
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[activity.status] || 'bg-gray-100'}`}>
          {statusLabels[activity.status] || activity.status}
        </span>
      </div>

      <h1 className="text-2xl font-bold">{activity.title}</h1>

      {/* Activity Code */}
      <Card>
        <h3 className="font-semibold mb-2">{t('activity.code_label')}</h3>
        <p className="text-3xl font-mono tracking-wider">{activity.joinCode}</p>
        <p className="text-sm text-gray-500 mt-1">{t('activity.share_tip')}</p>
      </Card>

      {/* PDF */}
      <Card>
        <h3 className="font-semibold mb-2">{t('activity.pdf_label')}</h3>
        {activity.pdfFileName ? (
          <p className="text-sm text-gray-600">{t('activity.pdf_uploaded', { name: activity.pdfFileName })}</p>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-2">{t('activity.pdf_none')}</p>
            <label className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              {uploading ? t('activity.uploading') : t('activity.upload_pdf')}
              <input type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} disabled={uploading} />
            </label>
          </div>
        )}
      </Card>

      {/* Students */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">{t('activity.joined_students_n', { n: activity.students.length })}</h3>
          {activity.status === 'waiting' && (
            <Button onClick={loadActivity} className="bg-gray-200 text-gray-700 hover:bg-gray-300">{t('common.refresh')}</Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {activity.students.map((s) => (
            <div key={s.id} className="p-2 bg-gray-50 rounded text-sm">
              {s.name} ({s.studentNumber})
            </div>
          ))}
        </div>
        {activity.students.length === 0 && (
          <p className="text-sm text-gray-400">{t('activity.no_students')}</p>
        )}
      </Card>

      {/* Groups (visible for active and ended) */}
      {activity.groups.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-3">{t('activity.groups_n', { n: activity.groups.length })}</h3>
          <div className="grid grid-cols-2 gap-3">
            {activity.groups.map((g) => (
              <Link
                key={g.id}
                href={`/teacher/activities/${params.id}/groups/${g.id}/chat`}
                className="block p-3 border rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{t('activity.group_n', { n: g.groupNumber })}</span>
                  <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded">
                    {aiRoleLabels[g.aiRole] || g.aiRole}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {g.members.map((m) => m.student.name).join('、')}
                </div>
                {g._count?.messages !== undefined && (
                  <div className="text-xs text-gray-400 mt-1">{t('activity.messages_n', { n: g._count.messages })}</div>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {activity.status === 'waiting' && (
          <Button onClick={handleStartGrouping} disabled={activity.students.length < 2}>
            {t('activity.start_grouping_n', { n: activity.students.length })}
          </Button>
        )}

        {activity.status === 'active' && (
          <>
            <Link href={`/teacher/activities/${params.id}/groups`}>
              <Button>{t('activity.manage_groups')}</Button>
            </Link>
            <Button onClick={handleEndDiscussion} className="bg-red-600 hover:bg-red-700">
              {t('activity.end_discussion')}
            </Button>
          </>
        )}

        {activity.status === 'ended' && (
          <>
            <Link href={`/teacher/activities/${params.id}/concept-maps`}>
              <Button>{t('activity.view_concept_maps')}</Button>
            </Link>
            <Link href={`/teacher/activities/${params.id}/export`}>
              <Button className="bg-gray-600 hover:bg-gray-700">{t('activity.export_data')}</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
