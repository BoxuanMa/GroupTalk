'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ArrowLeft, Shuffle, Play, ArrowRightLeft } from 'lucide-react'

interface Student { id: string; studentNumber: string; name: string }
interface GroupMember { id: string; student: Student }
interface Group { id: string; groupNumber: number; aiRole: string; members: GroupMember[] }

export default function GroupManagementPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const [groups, setGroups] = useState<Group[]>([])

  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null

  async function loadGroups() {
    const res = await fetch(`/api/activities/${params.id}/groups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setGroups(data.groups)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadGroups() }, [params.id])

  async function handleMoveStudent(studentId: string, targetGroupId: string) {
    await fetch(`/api/activities/${params.id}/groups/${targetGroupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ addStudentId: studentId }),
    })
    loadGroups()
  }

  async function handleChangeAiRole(groupId: string, aiRole: string) {
    await fetch(`/api/activities/${params.id}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ aiRole }),
    })
    loadGroups()
  }

  async function handleConfirm() {
    await fetch(`/api/activities/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'active' }),
    })
    router.push(`/teacher/activities/${params.id}`)
  }

  async function handleReshuffle() {
    await fetch(`/api/activities/${params.id}/groups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    loadGroups()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/teacher/activities/${params.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{t('groups.title')}</h1>
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {groups.map((group) => (
            <Card key={group.id}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800">{t('activity.group_n', { n: group.groupNumber })}</h3>
                <select
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  value={group.aiRole}
                  onChange={(e) => handleChangeAiRole(group.id, e.target.value)}
                  aria-label={`AI role for group ${group.groupNumber}`}
                >
                  <option value="system_helper">{t('activity.ai_role.system_helper')}</option>
                  <option value="known_ai_peer">{t('activity.ai_role.known_ai_peer')}</option>
                  <option value="hidden_ai_peer">{t('activity.ai_role.hidden_ai_peer')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                {group.members.map((m) => (
                  <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {m.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">{m.student.name}</span>
                        <span className="text-xs text-slate-400 ml-1.5">{m.student.studentNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                      <select
                        className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-600
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        value={group.id}
                        onChange={(e) => handleMoveStudent(m.student.id, e.target.value)}
                        aria-label={`Move ${m.student.name} to group`}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{t('activity.group_n', { n: g.groupNumber })}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={handleReshuffle} variant="secondary" size="lg">
            <Shuffle className="w-4 h-4" />
            {t('groups.reshuffle')}
          </Button>
          <Button onClick={handleConfirm} size="lg">
            <Play className="w-4 h-4" />
            {t('groups.confirm_start')}
          </Button>
        </div>
      </div>
    </div>
  )
}
