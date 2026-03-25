'use client'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const EXPORT_TYPES = [
  { type: 'messages', label: '聊天记录', format: 'CSV', description: '所有组的完整聊天记录，含时间戳和发言者信息' },
  { type: 'ai-logs', label: 'AI 日志', format: 'JSON', description: '每条 AI 消息的 prompt、response 和 token 使用' },
  { type: 'activity-logs', label: '行为日志', format: 'CSV', description: '学生的所有操作记录（加入、发消息、翻页等）' },
  { type: 'concept-maps', label: '概念图数据', format: 'JSON', description: '所有组的概念图节点和边（含编辑前后版本）' },
  { type: 'conditions', label: '实验条件', format: 'CSV', description: '每个组的 AI 角色配置和人数' },
]

export default function ExportPage() {
  const params = useParams()
  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null

  function handleDownload(type: string, format: string) {
    const url = `/api/activities/${params.id}/export?type=${type}`

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `${type}.${format === 'CSV' ? 'csv' : 'json'}`
        a.click()
        URL.revokeObjectURL(blobUrl)
      })
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">数据导出</h1>

      <div className="space-y-4">
        {EXPORT_TYPES.map((item) => (
          <Card key={item.type} className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{item.label}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.format}</span>
            </div>
            <Button onClick={() => handleDownload(item.type, item.format)}>下载</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
