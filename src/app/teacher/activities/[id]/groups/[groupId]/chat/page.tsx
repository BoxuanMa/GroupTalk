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

  // Load all groups for the activity (for switcher)
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

        // Build member list (students + AI) matching student-side shape
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

  // Connect socket once
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

  // Join room when groupId or socket changes
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
    <div className="h-screen flex">
      {/* Left: PDF viewer (same as student chat room) */}
      <div className="w-1/2 border-r">
        {pdfUrl ? (
          <PdfViewer url={pdfUrl} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            {t('student.chat.no_pdf')}
          </div>
        )}
      </div>

      {/* Right: chat panel */}
      <div className="w-1/2 flex flex-col">
        <div className="p-3 border-b bg-white flex items-center gap-3">
          <Link href={`/teacher/activities/${params.id}`} className="text-gray-400 hover:text-gray-600 transition">
            ← {t('common.back')}
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold flex items-center gap-2">
              {t('chat_history.title_n', { n: currentGroup?.groupNumber ?? '?' })}
              <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            </h1>
          </div>
          {groups.length > 1 && (
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={(params.groupId as string) || ''}
              onChange={(e) => switchGroup(e.target.value)}
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
