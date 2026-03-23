'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  async function loadMaps() {
    const res = await fetch(`/api/activities/${params.id}/concept-maps`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setMaps(data.conceptMaps || [])
  }

  useEffect(() => { loadMaps() }, [params.id])

  async function handleGenerate() {
    setGenerating(true)
    await fetch(`/api/activities/${params.id}/concept-maps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadMaps()
    setGenerating(false)
  }

  async function handleSave(mapId: string, nodes: Node[], edges: Edge[]) {
    await fetch(`/api/activities/${params.id}/concept-maps/${mapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nodes, edges }),
    })
    alert('保存成功')
  }

  const groupNumbers = [...new Set(maps.map((m) => m.group.groupNumber))].sort()
  const currentGroupNum = groupNumbers[currentGroupIndex]
  const pdfMap = maps.find((m) => m.group.groupNumber === currentGroupNum && m.type === 'pdf_based')
  const chatMap = maps.find((m) => m.group.groupNumber === currentGroupNum && m.type === 'chat_based')

  function toFlowNodes(map?: ConceptMap): Node[] {
    if (!map) return []
    return map.nodes.map((n) => ({
      id: n.id,
      type: 'concept',
      position: n.position,
      data: { label: n.label, category: n.category, color: n.color },
    }))
  }

  function toFlowEdges(map?: ConceptMap): Edge[] {
    if (!map) return []
    return map.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.relation,
      data: { relation: e.relation },
    }))
  }

  if (maps.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">概念图</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中...' : '生成概念图'}
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h1 className="font-bold">概念图</h1>
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
