'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/teacher/activities/${params.id}`} className="text-gray-400 hover:text-gray-600 transition">
          ← {t('common.back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('groups.title')}</h1>
        <div className="flex-1" />
        <LanguageSwitcher />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {groups.map((group) => (
          <Card key={group.id}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">{t('activity.group_n', { n: group.groupNumber })}</h3>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={group.aiRole}
                onChange={(e) => handleChangeAiRole(group.id, e.target.value)}
              >
                <option value="system_helper">{t('activity.ai_role.system_helper')}</option>
                <option value="known_ai_peer">{t('activity.ai_role.known_ai_peer')}</option>
                <option value="hidden_ai_peer">{t('activity.ai_role.hidden_ai_peer')}</option>
              </select>
            </div>

            <div className="space-y-1">
              {group.members.map((m) => (
                <div key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span>{m.student.name} ({m.student.studentNumber})</span>
                  <select
                    className="border rounded px-1 text-xs"
                    value={group.id}
                    onChange={(e) => handleMoveStudent(m.student.id, e.target.value)}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{t('activity.group_n', { n: g.groupNumber })}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button onClick={handleReshuffle} className="bg-gray-600 hover:bg-gray-700">{t('groups.reshuffle')}</Button>
        <Button onClick={handleConfirm}>{t('groups.confirm_start')}</Button>
      </div>
    </div>
  )
}
