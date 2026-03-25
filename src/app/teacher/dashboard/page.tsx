'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Activity {
  id: string
  title: string
  joinCode: string
  status: string
  createdAt: string
  _count: { students: number; groups: number }
}

const statusLabels: Record<string, string> = {
  draft: '草稿', waiting: '等待中', active: '进行中', ended: '已结束',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  waiting: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  ended: 'bg-blue-100 text-blue-700',
}

export default function DashboardPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const token = localStorage.getItem('teacher_token')
    if (!token) { router.push('/teacher/login'); return }

    fetch('/api/activities', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setActivities(data.activities || []))
  }, [router])

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
        <h1 className="text-2xl font-bold">我的活动</h1>
        <Link href="/teacher/activities/new">
          <Button>创建活动</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: '全部' },
          { key: 'active', label: '进行中' },
          { key: 'waiting', label: '等待中' },
          { key: 'ended', label: '已结束' },
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
                    活动码: {a.joinCode} · {a._count.students} 名学生 · {a._count.groups} 个小组
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    创建于 {new Date(a.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${statusColors[a.status] || 'bg-gray-100'}`}>
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            {activities.length === 0 ? '还没有活动，点击右上角创建一个' : '没有符合筛选条件的活动'}
          </p>
        )}
      </div>
    </div>
  )
}
