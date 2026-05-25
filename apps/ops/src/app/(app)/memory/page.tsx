'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence }                  from 'framer-motion'
import {
  Database, Search, Plus, Trash2, Tag,
  FileText, Star, Clock, Loader2,
  ChevronDown, X, Filter,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { MemoryEntry }   from '@/types/ops'
import toast                  from 'react-hot-toast'

/* ── Memory type config ── */
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  fact:       { label: 'Fact',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: FileText },
  preference: { label: 'Preference', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',         icon: Star     },
  context:    { label: 'Context',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       icon: Clock    },
  entity:     { label: 'Entity',     color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',          icon: Tag      },
  workflow:   { label: 'Workflow',   color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',    icon: FileText },
  contact:    { label: 'Contact',    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',    icon: Tag      },
}

/* ── Memory card component ── */
function MemoryCard({ entry, onDelete }: { entry: MemoryEntry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const typeCfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG['fact']!
  const TypeIcon = typeCfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Type icon */}
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${typeCfg.color}`}>
          <TypeIcon className="w-3 h-3" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Key */}
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-mono text-zinc-400 truncate">{entry.key}</p>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeCfg.color}`}>
              {typeCfg.label}
            </span>
          </div>

          {/* Value */}
          <p className={`text-sm text-zinc-200 leading-relaxed ${!expanded && 'line-clamp-2'}`}>
            {String(entry.value)}
          </p>
          {String(entry.value).length > 120 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 mt-1 flex items-center gap-1 transition-colors"
            >
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {Array.isArray(entry.metadata?.tags) && (entry.metadata.tags as string[]).length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {(entry.metadata.tags as string[]).map((tag: string) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-zinc-700 ml-auto shrink-0">
              {formatRelativeTime(entry.updatedAt)} · {entry.accessCount} accesses
            </span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={() => onDelete(entry.id)}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-700
            hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}

/* ── Add memory modal ── */
function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (entry: Partial<MemoryEntry>) => void }) {
  const [key,   setKey]   = useState('')
  const [value, setValue] = useState('')
  const [type,  setType]  = useState<string>('fact')
  const [tags,  setTags]  = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim() || !value.trim()) return
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
    onAdd({
      key:      key.trim(),
      value:    value.trim(),
      type:     type as MemoryEntry['type'],
      metadata: parsedTags.length > 0 ? { tags: parsedTags } : {},
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">Store Memory</h3>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Key *</label>
              <input
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="client_name, preference…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-200
                  placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                  focus:outline-none focus:border-indigo-500 transition-all"
              >
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Value *</label>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="What to remember…"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="client, urgent, project-x"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

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
              disabled={!key.trim() || !value.trim()}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-sm font-semibold text-white
                hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Store Memory
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Main page ── */
export default function MemoryPage() {
  const [entries,    setEntries]    = useState<MemoryEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [query,      setQuery]      = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showAdd,    setShowAdd]    = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (q?: string, t?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: t && t !== 'all' ? t : 'fact' })
      if (q) params.set('query', q)
      const r = await fetch(`/api/memory?${params}`)
      const j = await r.json()
      setEntries(j.data ?? [])
    } catch {
      toast.error('Failed to load memory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Debounced search
  const handleSearch = (q: string) => {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      void load(q, typeFilter)
    }, 400)
  }

  const handleTypeFilter = (t: string) => {
    setTypeFilter(t)
    void load(query, t)
  }

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setEntries(es => es.filter(e => e.id !== id))
      toast.success('Memory deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }, [])

  const handleAdd = useCallback(async (entry: Partial<MemoryEntry>) => {
    try {
      const r = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'store', ...entry }),
      })
      const j = await r.json()
      if (j.data) {
        setEntries(es => [j.data, ...es])
        toast.success('Memory stored')
      }
      setShowAdd(false)
    } catch {
      toast.error('Failed to store memory')
    }
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Memory Engine</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {entries.length} entries · Say "Remember…" to store via voice
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-sm font-semibold text-white
            hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
        >
          <Plus className="w-4 h-4" /> Store Memory
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search memories…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200
              placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-1.5">
          <Filter className="w-3 h-3 text-zinc-600 ml-1.5" />
          {['all', ...Object.keys(TYPE_CONFIG)].map(t => (
            <button
              key={t}
              onClick={() => handleTypeFilter(t)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                typeFilter === t
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(TYPE_CONFIG).map(([t, cfg]) => {
          const count = entries.filter(e => e.type === t).length
          const TypeIcon = cfg.icon
          return (
            <button
              key={t}
              onClick={() => handleTypeFilter(t === typeFilter ? 'all' : t)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                typeFilter === t
                  ? `border-current bg-current/5 ${cfg.color}`
                  : 'border-zinc-800 text-zinc-600 hover:border-zinc-700'
              }`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span className="text-lg font-black">{count}</span>
              <span className="text-[9px] font-medium">{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Memory list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/30"
        >
          <Database className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-1">
            {query ? `No memories matching "${query}"` : 'No memories yet'}
          </p>
          <p className="text-xs text-zinc-700">
            {query ? 'Try a different search' : 'Say "Remember: client meeting is Friday" to store'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {entries.map(entry => (
              <MemoryCard
                key={entry.id}
                entry={entry}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <AddModal
            onClose={() => setShowAdd(false)}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
