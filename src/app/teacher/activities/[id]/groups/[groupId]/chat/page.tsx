'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { io, Socket } from 'socket.io-client'
import { ChatPanel } from '@/components/chat-panel'
const PdfViewer = dynamic(() => import('@/components/pdf-viewer').then((m) => m.PdfViewer), { ssr: false })
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LanguageSwitcher } from '@/components/language-switcher'
import { mergeAiConfig } from '@/lib/ai-config'
import { ArrowLeft, FileText } from 'lucide-react'

interface GroupInfo {
  id: string
  groupNumber: number
  members: Array<{ student: { id: string; name: string } }>
}

type Member = { id?: string; name: string; type?: 'student' | 'ai' | 'teacher' }

export default function GroupChatLivePage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useI18n()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [currentGroup, setCurrentGroup] = useState<GroupInfo | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [connected, setConnected] = useState(false)
  const [teacherId, setTeacherId] = useState('')
  const socketRef = useRef<Socket | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null
  const groupId = params.groupId as string

  useEffect(() => {
    if (!token) return
    fetch(`/api/activities/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const gs: GroupInfo[] = data.activity?.groups || []
        setGroups(gs)
        const cur = gs.find((g) => g.id === groupId) || null
        setCurrentGroup(cur)
        setPdfUrl(data.activity?.pdfUrl || null)

        const curGroup = data.activity?.groups?.find((g: { id: string }) => g.id === groupId)
        const humanMembers: Member[] = (curGroup?.members || []).map((m: { student: { id: string; name: string } }) => ({
          id: m.student.id,
          name: m.student.name,
          type: 'student' as const,
        }))
        const aiCfg = mergeAiConfig(
          (data.activity?.aiConfig as Record<string, unknown>) || {},
          (curGroup?.aiConfig as Record<string, unknown> | null) || null,
        )
        const aiMember: Member = {
          id: `ai-${groupId}`,
          name: aiCfg.displayName,
          type: aiCfg.role === 'hidden_ai_peer' ? 'student' : 'ai',
        }
        setMembers([...humanMembers, aiMember])
      })

    try {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload?.userId) setTeacherId(payload.userId)
      }
    } catch {}
  }, [params.id, groupId, token])

  useEffect(() => {
    if (!token) return
    if (socketRef.current) {
      setSocket(socketRef.current)
      return
    }
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
    })
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('error', (msg: string) => {
      console.error('[teacher chat] socket error:', msg)
    })
    socketRef.current = s
    setSocket(s)
    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [token])

  useEffect(() => {
    if (!groupId || !socket) return
    const joinNow = () => socket.emit('join-group', groupId)
    if (socket.connected) joinNow()
    else socket.once('connect', joinNow)
  }, [groupId, socket])

  function switchGroup(newGroupId: string) {
    if (newGroupId === groupId) return
    router.push(`/teacher/activities/${params.id}/groups/${newGroupId}/chat`)
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Left: PDF viewer */}
      <div className="w-1/2 border-r border-slate-200">
        {pdfUrl ? (
          <PdfViewer url={pdfUrl} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            {t('student.chat.no_pdf')}
          </div>
        )}
      </div>

      {/* Right: chat panel */}
      <div className="w-1/2 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
          <Link href={`/teacher/activities/${params.id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-800 flex items-center gap-2">
              {t('chat_history.title_n', { n: currentGroup?.groupNumber ?? '?' })}
              <span className={`inline-block w-2 h-2 rounded-full transition-colors ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </h1>
          </div>
          {groups.length > 1 && (
            <select
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700
                focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              value={(params.groupId as string) || ''}
              onChange={(e) => switchGroup(e.target.value)}
              aria-label="Switch group"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {t('chat_history.title_n', { n: g.groupNumber })}
                </option>
              ))}
            </select>
          )}
          <LanguageSwitcher />
        </div>

        <div className="flex-1 min-h-0">
          <ChatPanel
            socket={socket}
            groupId={groupId}
            currentUserId={teacherId}
            members={members}
          />
        </div>
      </div>
    </div>
  )
}
