'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ConceptMapEditor } from '@/components/concept-map-editor'
import { Button } from '@/components/ui/button'
import { Node, Edge } from 'reactflow'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Loader2, GitBranch } from 'lucide-react'

interface StoredNode {
  id: string
  label: string
  category: string
  color: string
  position: { x: number; y: number }
}
interface StoredEdge {
  id: string
  source: string
  target: string
  relation: string
}
interface ConceptMap {
  id: string
  groupId: string
  type: string
  nodes: StoredNode[]
  edges: StoredEdge[]
  group: { groupNumber: number }
}

export default function ConceptMapsPage() {
  const params = useParams()
  const { t } = useI18n()
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
        setError(`${t('common.load_failed')} (${res.status})`)
        return
      }
      const data = await res.json()
      setMaps(data.conceptMaps || [])
    } catch (e) {
      setError(t('common.network_error'))
      console.error('loadMaps error:', e)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMaps() }, [params.id])

  async function handleGenerate(isRegenerate = false) {
    if (isRegenerate && !confirm(t('concept.regenerate_warn'))) return
    const token = localStorage.getItem('teacher_token')
    setGenerating(true)
    try {
      const res = await fetch(`/api/activities/${params.id}/concept-maps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        alert(`${t('concept.generate_failed')} (${res.status}) ${msg}`)
        return
      }
      await loadMaps()
    } catch (e) {
      console.error('handleGenerate error:', e)
      alert(`${t('concept.generate_failed')}: ${t('common.network_error')}`)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave(mapId: string, nodes: Node[], edges: Edge[]) {
    const token = localStorage.getItem('teacher_token')
    try {
      const res = await fetch(`/api/activities/${params.id}/concept-maps/${mapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nodes, edges }),
      })
      if (!res.ok) {
        alert(`${t('concept.save_failed')} (${res.status})`)
        return
      }
      alert(t('concept.save_success'))
    } catch (e) {
      console.error('handleSave error:', e)
      alert(`${t('concept.save_failed')}: ${t('common.network_error')}`)
    }
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6 text-center">
          <Link href={`/teacher/activities/${params.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <p className="text-red-600 mt-6 bg-red-50 p-4 rounded-lg">{error}</p>
          <Button onClick={loadMaps} className="mt-4">{t('common.retry')}</Button>
        </div>
      </div>
    )
  }

  if (maps.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-6 text-center">
          <Link href={`/teacher/activities/${params.id}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <div className="mt-12">
            <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('concept.title')}</h1>
            <Button onClick={() => handleGenerate(false)} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('concept.generating')}
                </>
              ) : t('concept.generate')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <Link href={`/teacher/activities/${params.id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <h1 className="font-bold text-slate-800">{t('concept.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentGroupIndex((i) => Math.max(0, i - 1))}
            disabled={currentGroupIndex === 0}
            aria-label="Previous group"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[80px] text-center">{t('concept.group_n', { n: currentGroupNum })}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentGroupIndex((i) => Math.min(groupNumbers.length - 1, i + 1))}
            disabled={currentGroupIndex >= groupNumbers.length - 1}
            aria-label="Next group"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? t('concept.generating') : t('concept.regenerate')}
          </Button>
          <LanguageSwitcher className="ml-1" />
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-1/2 border-r border-slate-200">
          {pdfMap ? (
            <ConceptMapEditor
              key={`pdf-${pdfMap.id}`}
              initialNodes={toFlowNodes(pdfMap)}
              initialEdges={toFlowEdges(pdfMap)}
              onSave={(nodes, edges) => handleSave(pdfMap.id, nodes, edges)}
              title={t('concept.pdf_map')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <GitBranch className="w-8 h-8 mb-2 opacity-50" />
              {t('concept.no_pdf_map')}
            </div>
          )}
        </div>
        <div className="w-1/2">
          {chatMap ? (
            <ConceptMapEditor
              key={`chat-${chatMap.id}`}
              initialNodes={toFlowNodes(chatMap)}
              initialEdges={toFlowEdges(chatMap)}
              onSave={(nodes, edges) => handleSave(chatMap.id, nodes, edges)}
              title={t('concept.chat_map')}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <GitBranch className="w-8 h-8 mb-2 opacity-50" />
              {t('concept.no_chat_map')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
