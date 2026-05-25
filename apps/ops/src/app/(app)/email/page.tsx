'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import {
  Mail, RefreshCw, Send, Sparkles, ChevronRight,
  Inbox, Star, Loader2,
  User, Clock, X, Edit3,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { EmailThread }   from '@/types/ops'
import toast                  from 'react-hot-toast'

/* ── Sentiment badge ── */
function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  if (!sentiment || sentiment === 'neutral') return null
  const map: Record<string, string> = {
    negative: 'text-red-400 bg-red-500/10 border-red-500/20',
    positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${map[sentiment] ?? ''}`}>
      {sentiment}
    </span>
  )
}

/* ── Email thread row ── */
function ThreadRow({ thread, onClick, selected }: {
  thread: EmailThread
  onClick: () => void
  selected: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      layout
      className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-zinc-800/60 last:border-0
        text-left transition-all hover:bg-zinc-800/30 ${selected ? 'bg-zinc-800/50' : ''}`}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3.5 h-3.5 text-zinc-500" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={`text-xs truncate ${thread.isRead ? 'text-zinc-400' : 'text-white font-semibold'}`}>
            {thread.participants[0] ?? 'Unknown sender'}
          </p>
          {!thread.isRead && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
          {thread.isImportant && (
            <Star className="w-3 h-3 text-amber-400 shrink-0" />
          )}
          <SentimentBadge sentiment={thread.sentiment} />
          <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
            {thread.lastMessageAt ? formatRelativeTime(thread.lastMessageAt) : ''}
          </span>
        </div>
        <p className={`text-xs truncate ${thread.isRead ? 'text-zinc-500' : 'text-zinc-300'}`}>
          {thread.subject ?? '(no subject)'}
        </p>
        {thread.aiSummary && (
          <p className="text-[10px] text-zinc-600 truncate mt-0.5">
            <Sparkles className="w-2.5 h-2.5 inline mr-1 text-indigo-400" />
            {thread.aiSummary}
          </p>
        )}
      </div>
      <ChevronRight className={`w-3 h-3 text-zinc-700 shrink-0 mt-1 transition-transform ${selected ? 'rotate-90' : ''}`} />
    </motion.button>
  )
}

/* ── Thread detail panel ── */
function ThreadDetail({ thread, onClose, onSummarize, onDraft }: {
  thread: EmailThread
  onClose: () => void
  onSummarize: (id: string) => void
  onDraft: (id: string) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex flex-col h-full"
    >
      {/* Detail header */}
      <div className="flex items-start justify-between p-5 border-b border-zinc-800">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-white mb-1">{thread.subject ?? '(no subject)'}</p>
          <p className="text-xs text-zinc-500">From: {thread.participants[0] ?? 'Unknown'}</p>
          {thread.lastMessageAt && (
            <p className="text-xs text-zinc-600 mt-0.5">{formatRelativeTime(thread.lastMessageAt)}</p>
          )}
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* AI Summary */}
      {thread.aiSummary ? (
        <div className="mx-5 mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">AI Summary</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{thread.aiSummary}</p>
        </div>
      ) : (
        <button
          onClick={() => onSummarize(thread.id)}
          className="mx-5 mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-700
            text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Generate AI summary
        </button>
      )}

      {/* Snippet preview */}
      {thread.snippet && (
        <div className="flex-1 overflow-y-auto mx-5 mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{thread.snippet}</p>
        </div>
      )}

      {/* Actions */}
      <div className="p-5 border-t border-zinc-800 flex gap-3">
        <button
          onClick={() => onDraft(thread.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600
            text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" /> AI Draft Reply
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700
          text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-all">
          <Star className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

/* ── Compose modal ── */
function ComposeModal({ onClose, onSend }: {
  onClose: () => void
  onSend: (to: string, subject: string, body: string) => void
}) {
  const [to,      setTo]      = useState('')
  const [subject, setSubject] = useState('')
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    await onSend(to, subject, body)
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white">New Email</h3>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-3">
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="To: email@example.com"
            type="email"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
              placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
          />
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
              placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={8}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
              placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!to.trim() || !subject.trim() || !body.trim() || sending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white
                hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Main page ── */
export default function EmailPage() {
  const [threads,    setThreads]    = useState<EmailThread[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<EmailThread | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [summarizing, setSummarizing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/email?action=list')
      const j = await r.json()
      setThreads(j.data ?? [])
    } catch {
      toast.error('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleSummarize = useCallback(async (id: string) => {
    setSummarizing(id)
    try {
      const r = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', threadId: id }),
      })
      const j = await r.json()
      if (j.summary) {
        setThreads(ts => ts.map(t => t.id === id ? { ...t, aiSummary: j.summary } : t))
        if (selected?.id === id) setSelected(s => s ? { ...s, aiSummary: j.summary } : s)
        toast.success('Summary ready')
      }
    } catch {
      toast.error('Failed to summarize')
    } finally {
      setSummarizing(null)
    }
  }, [selected])

  const handleDraft = useCallback(async (id: string) => {
    toast.loading('Drafting AI reply…', { id: 'draft' })
    try {
      const r = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft_reply', threadId: id }),
      })
      const j = await r.json()
      if (j.draft) {
        toast.dismiss('draft')
        toast.success('Draft ready — opening compose')
        setShowCompose(true)
      }
    } catch {
      toast.error('Failed to draft reply', { id: 'draft' })
    }
  }, [])

  const handleSend = useCallback(async (to: string, subject: string, body: string) => {
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', to, subject, body }),
      })
      toast.success('Email sent!')
      setShowCompose(false)
    } catch {
      toast.error('Failed to send email')
    }
  }, [])

  const unread    = threads.filter(t => !t.isRead).length
  const important = threads.filter(t => t.isImportant).length

  return (
    <div className="p-6 h-full flex flex-col max-w-6xl mx-auto gap-6">

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">Email Hub</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
            {important > 0 && ` · ${important} important`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-400
              hover:text-white hover:border-zinc-600 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white
              hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
          >
            <Send className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {[
          { icon: Inbox,  label: 'Total',     value: threads.length, color: 'text-zinc-400'   },
          { icon: Mail,   label: 'Unread',    value: unread,         color: 'text-indigo-400' },
          { icon: Star,   label: 'Important', value: important,      color: 'text-amber-400'  },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-zinc-600">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: thread list + detail */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Thread list */}
        <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col transition-all ${
          selected ? 'w-96 shrink-0' : 'flex-1'
        }`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" /> Inbox
            </h3>
            <span className="text-xs text-zinc-600">{threads.length} threads</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-16">
                <Mail className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No emails</p>
                <p className="text-xs text-zinc-700 mt-1">Connect Gmail or Outlook via voice</p>
              </div>
            ) : (
              threads.map(thread => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  selected={selected?.id === thread.id}
                  onClick={() => setSelected(s => s?.id === thread.id ? null : thread)}
                />
              ))
            )}
          </div>
        </div>

        {/* Thread detail */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
            >
              <ThreadDetail
                thread={selected}
                onClose={() => setSelected(null)}
                onSummarize={handleSummarize}
                onDraft={handleDraft}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice tip */}
      <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <p className="text-xs text-zinc-600">
          Try: <span className="text-zinc-400">"Hey Kenuxa, summarize my inbox"</span> ·{' '}
          <span className="text-zinc-400">"Send email to John about the project update"</span>
        </p>
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {showCompose && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            onSend={handleSend}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
