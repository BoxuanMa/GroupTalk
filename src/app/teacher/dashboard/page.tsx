'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

interface Activity {
  id: string
  title: string
  joinCode: string
  status: string
  createdAt: string
  _count: { students: number; groups: number }
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  waiting: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-blue-100 text-blue-700',
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [teacherName, setTeacherName] = useState<string>('')

  const statusLabels: Record<string, string> = {
    draft: t('teacher.dashboard.status.draft'),
    waiting: t('teacher.dashboard.status.waiting'),
    active: t('teacher.dashboard.status.active'),
    ended: t('teacher.dashboard.status.ended'),
  }

  useEffect(() => {
    const token = localStorage.getItem('teacher_token')
    if (!token) { router.push('/teacher/login'); return }

    fetch('/api/activities', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setActivities(data.activities || []))

    fetch('/api/teacher/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { if (data.teacher?.name) setTeacherName(data.teacher.name) })
  }, [router])

  async function handleEditName() {
    const next = prompt(t('teacher.dashboard.edit_name_prompt'), teacherName)
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed || trimmed === teacherName) return
    const token = localStorage.getItem('teacher_token')
    const res = await fetch('/api/teacher/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: trimmed }),
    })
    if (!res.ok) { alert(t('teacher.dashboard.edit_name_failed')); return }
    setTeacherName(trimmed)
  }

  async function handleDelete(e: React.MouseEvent, activityId: string, title: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(t('teacher.dashboard.delete_confirm', { title }))) return
    const token = localStorage.getItem('teacher_token')
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      alert(t('teacher.dashboard.delete_failed'))
      return
    }
    setActivities((prev) => prev.filter((a) => a.id !== activityId))
  }

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.status === filter)

  const counts = {
    all: activities.length,
    waiting: activities.filter((a) => a.status === 'waiting').length,
    active: activities.filter((a) => a.status === 'active').length,
    ended: activities.filter((a) => a.status === 'ended').length,
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('teacher.dashboard.title')}</h1>
        <div className="flex items-center gap-3">
          {teacherName && (
            <button
              onClick={handleEditName}
              className="text-sm text-gray-600 hover:text-blue-600 transition"
              title={t('teacher.dashboard.edit_name')}
            >
              👤 {teacherName}
            </button>
          )}
          <LanguageSwitcher />
          <Link href="/teacher/activities/new">
            <Button>{t('teacher.dashboard.new')}</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: t('teacher.dashboard.filter.all') },
          { key: 'active', label: t('teacher.dashboard.filter.active') },
          { key: 'waiting', label: t('teacher.dashboard.filter.waiting') },
          { key: 'ended', label: t('teacher.dashboard.filter.ended') },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label} ({counts[f.key as keyof typeof counts]})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((a) => (
          <Link key={a.id} href={`/teacher/activities/${a.id}`}>
            <Card className="hover:shadow-md transition cursor-pointer mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-gray-500">
                    {t('teacher.dashboard.join_code')}: {a.joinCode} · {t('teacher.dashboard.students_n', { n: a._count.students })} · {t('teacher.dashboard.groups_n', { n: a._count.groups })}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('teacher.dashboard.created_at', { time: new Date(a.createdAt).toLocaleString() })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColors[a.status] || 'bg-gray-100'}`}>
                    {statusLabels[a.status] || a.status}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, a.id, a.title)}
                    className="text-gray-400 hover:text-red-600 transition p-1"
                    title={t('teacher.dashboard.delete')}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            {activities.length === 0 ? t('teacher.dashboard.empty') : t('teacher.dashboard.empty_filter')}
          </p>
        )}
      </div>
    </div>
  )
}
