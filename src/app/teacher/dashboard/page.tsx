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

export default function DashboardPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/teacher/login'); return }

    fetch('/api/activities', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setActivities(data.activities || []))
  }, [router])

  const statusLabels: Record<string, string> = {
    draft: '草稿', waiting: '等待中', active: '进行中', ended: '已结束',
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">我的活动</h1>
        <Link href="/teacher/activities/new">
          <Button>创建活动</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {activities.map((a) => (
          <Link key={a.id} href={`/teacher/activities/${a.id}`}>
            <Card className="hover:shadow-md transition cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-sm text-gray-500">
                    活动码: {a.joinCode} · {a._count.students} 名学生 · {a._count.groups} 个小组
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100">
                  {statusLabels[a.status] || a.status}
                </span>
              </div>
            </Card>
          </Link>
        ))}

        {activities.length === 0 && (
          <p className="text-center text-gray-400 py-12">还没有活动，点击右上角创建一个</p>
        )}
      </div>
    </div>
  )
}
