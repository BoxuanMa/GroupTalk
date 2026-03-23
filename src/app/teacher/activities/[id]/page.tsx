'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Student { id: string; studentNumber: string; name: string }
interface Activity {
  id: string; title: string; joinCode: string; status: string
  students: Student[]
}

export default function ActivityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [activity, setActivity] = useState<Activity | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

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
    await fetch(`/api/activities/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'ended' }),
    })
    loadActivity()
  }

  if (!activity) return <div className="p-6">加载中...</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{activity.title}</h1>
        <span className="px-3 py-1 rounded-full bg-gray-100">{activity.status}</span>
      </div>

      <Card>
        <h3 className="font-semibold mb-2">活动码</h3>
        <p className="text-3xl font-mono tracking-wider">{activity.joinCode}</p>
        <p className="text-sm text-gray-500 mt-1">将此活动码分享给学生</p>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">已加入的学生 ({activity.students.length})</h3>
          <Button onClick={loadActivity} className="bg-gray-200 text-gray-700 hover:bg-gray-300">刷新</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {activity.students.map((s) => (
            <div key={s.id} className="p-2 bg-gray-50 rounded text-sm">
              {s.name} ({s.studentNumber})
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-4">
        {activity.status === 'waiting' && (
          <Button onClick={handleStartGrouping} disabled={activity.students.length < 2}>
            开始分组 ({activity.students.length} 人)
          </Button>
        )}

        {activity.status === 'active' && (
          <>
            <Button onClick={handleEndDiscussion} className="bg-red-600 hover:bg-red-700">
              结束讨论
            </Button>
            <Link href={`/teacher/activities/${params.id}/groups`}>
              <Button className="bg-gray-600 hover:bg-gray-700">查看分组</Button>
            </Link>
          </>
        )}

        {activity.status === 'ended' && (
          <>
            <Link href={`/teacher/activities/${params.id}/concept-maps`}>
              <Button>查看概念图</Button>
            </Link>
            <Link href={`/teacher/activities/${params.id}/export`}>
              <Button className="bg-gray-600 hover:bg-gray-700">导出数据</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
