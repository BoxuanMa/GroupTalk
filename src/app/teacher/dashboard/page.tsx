'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Plus, Trash2, User, Users, Hash, Calendar } from 'lucide-react'

interface Activity {
  id: string
  title: string
  joinCode: string
  status: string
  createdAt: string
  _count: { students: number; groups: number }
}

const statusStyles: Record<string, { bg: string; dot: string }> = {
  draft: { bg: 'bg-slate-50 text-slate-600 border border-slate-200', dot: 'bg-slate-400' },
  waiting: { bg: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-400' },
  active: { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  ended: { bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-400' },
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('teacher.dashboard.title')}</h1>
            {teacherName && (
              <button
                onClick={handleEditName}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                title={t('teacher.dashboard.edit_name')}
              >
                <User className="w-3.5 h-3.5" />
                {teacherName}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/teacher/activities/new">
              <Button size="md">
                <Plus className="w-4 h-4" />
                {t('teacher.dashboard.new')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6" role="tablist">
          {[
            { key: 'all', label: t('teacher.dashboard.filter.all') },
            { key: 'active', label: t('teacher.dashboard.filter.active') },
            { key: 'waiting', label: t('teacher.dashboard.filter.waiting') },
            { key: 'ended', label: t('teacher.dashboard.filter.ended') },
          ].map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                filter === f.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label} ({counts[f.key as keyof typeof counts]})
            </button>
          ))}
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {filtered.map((a) => (
            <Link key={a.id} href={`/teacher/activities/${a.id}`} className="block">
              <Card className="hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 truncate">{a.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[a.status]?.bg || 'bg-slate-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[a.status]?.dot || 'bg-slate-400'}`} />
                        {statusLabels[a.status] || a.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        {a.joinCode}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {t('teacher.dashboard.students_n', { n: a._count.students })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, a.id, a.title)}
                    className="flex-shrink-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-3"
                    title={t('teacher.dashboard.delete')}
                    aria-label={`Delete ${a.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mb-4">
                <Users className="w-8 h-8" />
              </div>
              <p className="text-slate-500 text-lg font-medium">
                {activities.length === 0 ? t('teacher.dashboard.empty') : t('teacher.dashboard.empty_filter')}
              </p>
              {activities.length === 0 && (
                <Link href="/teacher/activities/new" className="inline-block mt-4">
                  <Button variant="secondary">
                    <Plus className="w-4 h-4" />
                    {t('teacher.dashboard.new')}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
