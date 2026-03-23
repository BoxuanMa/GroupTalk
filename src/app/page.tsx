'use client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">GroupTalk</h1>
          <p className="text-gray-500 mt-2">协作学习研究平台</p>
        </div>
        <Card>
          <div className="space-y-4">
            <Link href="/teacher/login">
              <Button className="w-full">老师入口</Button>
            </Link>
            <Link href="/student/join">
              <Button className="w-full bg-green-600 hover:bg-green-700">学生入口</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
