'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ConceptMapEditor } from '@/components/concept-map-editor'
import { Button } from '@/components/ui/button'
import { Node, Edge } from 'reactflow'

interface ConceptMap {
  id: string
  groupId: string
  type: string
  nodes: Array<{ id: string; label: string; category: string; color: string; position: { x: number; y: number } }>
  edges: Array<{ id: string; source: string; target: string; relation: string }>
  group: { groupNumber: number }
}

export default function ConceptMapsPage() {
  const params = useParams()
  const [maps, setMaps] = useState<ConceptMap[]>([])
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadMaps() {
    const token = localStorage.getItem('teacher_token')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/activities/${params.id}/concept-maps`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError(`加载失败 (${res.status})`)
        return
      }
      const data = await res.json()
      setMaps(data.conceptMaps || [])
    } catch (e) {
      setError('网络错误')
      console.error('loadMaps error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMaps() }, [params.id])

  async function handleGenerate(isRegenerate = false) {
    if (isRegenerate && !confirm('重新生成会覆盖现有概念图（已编辑的修改将丢失），并消耗 API token。确定要重新生成吗？')) return
    const token = localStorage.getItem('teacher_token')
    setGenerating(true)
    await fetch(`/api/activities/${params.id}/concept-maps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadMaps()
    setGenerating(false)
  }

  async function handleSave(mapId: string, nodes: Node[], edges: Edge[]) {
    const token = localStorage.getItem('teacher_token')
    await fetch(`/api/activities/${params.id}/concept-maps/${mapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nodes, edges }),
    })
    alert('保存成功')
  }

  const groupNumbers = Array.from(new Set(maps.map((m) => m.group.groupNumber))).sort()
  const currentGroupNum = groupNumbers[currentGroupIndex]
  const pdfMap = maps.find((m) => m.group.groupNumber === currentGroupNum && m.type === 'pdf_based')
  const chatMap = maps.find((m) => m.group.groupNumber === currentGroupNum && m.type === 'chat_based')

  function toFlowNodes(map?: ConceptMap): Node[] {
    if (!map) return []
    return map.nodes.map((n) => ({
      id: String(n.id),
      type: 'concept',
      position: n.position || { x: 0, y: 0 },
      data: { label: n.label, category: n.category, color: n.color },
    }))
  }

  function toFlowEdges(map?: ConceptMap): Edge[] {
    if (!map) return []
    return map.edges.map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      label: e.relation,
      data: { relation: e.relation },
    }))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-400 py-12">加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <Link href={`/teacher/activities/${params.id}`} className="text-gray-400 hover:text-gray-600 transition text-sm">
          ← 返回活动
        </Link>
        <p className="text-red-500 mt-4">{error}</p>
        <Button onClick={loadMaps} className="mt-2">重试</Button>
      </div>
    )
  }

  if (maps.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <Link href={`/teacher/activities/${params.id}`} className="text-gray-400 hover:text-gray-600 transition text-sm">
          ← 返回活动
        </Link>
        <h1 className="text-2xl font-bold mb-6 mt-4">概念图</h1>
        <Button onClick={() => handleGenerate(false)} disabled={generating}>
          {generating ? '生成中...' : '生成概念图'}
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <Link href={`/teacher/activities/${params.id}`} className="text-gray-400 hover:text-gray-600 transition">
            ← 返回
          </Link>
          <h1 className="font-bold">概念图</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setCurrentGroupIndex((i) => Math.max(0, i - 1))}
            disabled={currentGroupIndex === 0}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ◀
          </Button>
          <span>第 {currentGroupNum} 组</span>
          <Button
            onClick={() => setCurrentGroupIndex((i) => Math.min(groupNumbers.length - 1, i + 1))}
            disabled={currentGroupIndex >= groupNumbers.length - 1}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            ▶
          </Button>
          <Button
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="ml-4 px-3 py-1 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200"
          >
            {generating ? '生成中...' : '重新生成'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/2 border-r">
          {pdfMap ? (
            <ConceptMapEditor
              key={`pdf-${pdfMap.id}`}
              initialNodes={toFlowNodes(pdfMap)}
              initialEdges={toFlowEdges(pdfMap)}
              onSave={(nodes, edges) => handleSave(pdfMap.id, nodes, edges)}
              title="PDF 概念图"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">无 PDF 概念图</div>
          )}
        </div>
        <div className="w-1/2">
          {chatMap ? (
            <ConceptMapEditor
              key={`chat-${chatMap.id}`}
              initialNodes={toFlowNodes(chatMap)}
              initialEdges={toFlowEdges(chatMap)}
              onSave={(nodes, edges) => handleSave(chatMap.id, nodes, edges)}
              title="聊天概念图"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">无聊天概念图</div>
          )}
        </div>
      </div>
    </div>
  )
}
