'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import {
  Puzzle, Search, CheckCircle2, XCircle, Loader2,
  Globe, Mail, Brain, Zap, Database,
  ToggleLeft, ToggleRight, ExternalLink, Info, X,
} from 'lucide-react'
import type { Plugin } from '@/types/ops'
import toast           from 'react-hot-toast'

/* ── Category config ── */
const CATEGORY_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  browser:      { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',      icon: Globe    },
  email:        { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: Mail     },
  ai:           { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Brain    },
  automation:   { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',    icon: Zap      },
  data:         { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Database },
  integration:  { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',       icon: Puzzle   },
}

/* ── Plugin card ── */
function PluginCard({
  plugin,
  onToggle,
  onDetail,
}: {
  plugin: Plugin
  onToggle: (id: string, active: boolean) => void
  onDetail: (plugin: Plugin) => void
}) {
  const cfg = CATEGORY_CONFIG[plugin.category] ?? CATEGORY_CONFIG['integration']!
  const CatIcon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-zinc-900/40 p-5 flex flex-col gap-4 transition-all hover:border-zinc-700 ${
        plugin.isActive ? 'border-zinc-700' : 'border-zinc-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.color}`}>
            <CatIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white">{plugin.name}</p>
              {plugin.isBuiltIn && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-medium">
                  BUILT-IN
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600">v{plugin.version} · {plugin.author}</p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(plugin.id, !plugin.isActive)}
          className={`shrink-0 transition-colors ${
            plugin.isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-700 hover:text-zinc-500'
          }`}
          title={plugin.isActive ? 'Disable plugin' : 'Enable plugin'}
        >
          {plugin.isActive
            ? <ToggleRight className="w-6 h-6" />
            : <ToggleLeft className="w-6 h-6" />
          }
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{plugin.description}</p>

      {/* Tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium ${cfg.color}`}>
          {plugin.category}
        </span>
        {plugin.permissions?.slice(0, 2).map(p => (
          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-600">
            {p}
          </span>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
        <div className="flex items-center gap-1.5">
          {plugin.isActive ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
              <XCircle className="w-3 h-3" /> Inactive
            </span>
          )}
        </div>
        <button
          onClick={() => onDetail(plugin)}
          className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <Info className="w-3 h-3" /> Details
        </button>
      </div>
    </motion.div>
  )
}

/* ── Detail modal ── */
function DetailModal({ plugin, onClose, onToggle }: {
  plugin: Plugin
  onClose: () => void
  onToggle: (id: string, active: boolean) => void
}) {
  const cfg = CATEGORY_CONFIG[plugin.category] ?? CATEGORY_CONFIG['integration']!
  const CatIcon = cfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${cfg.color}`}>
              <CatIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{plugin.name}</h3>
              <p className="text-xs text-zinc-500">v{plugin.version} by {plugin.author}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400 leading-relaxed">{plugin.description}</p>

          {/* Capabilities */}
          {plugin.capabilities && plugin.capabilities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">Capabilities</p>
              <div className="space-y-1">
                {plugin.capabilities.map(cap => (
                  <div key={cap} className="flex items-center gap-2 text-xs text-zinc-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    {cap}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permissions */}
          {plugin.permissions && plugin.permissions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2">Required permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {plugin.permissions.map(p => (
                  <span key={p} className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Config keys hint */}
          {plugin.configSchema && Object.keys(plugin.configSchema).length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-400 font-medium mb-1">Configuration required</p>
              <p className="text-[10px] text-zinc-500">
                Set {Object.keys(plugin.configSchema).join(', ')} in your environment to enable full functionality.
              </p>
            </div>
          )}

          {/* Action */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => { onToggle(plugin.id, !plugin.isActive); onClose() }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                plugin.isActive
                  ? 'bg-zinc-700 hover:bg-zinc-600'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {plugin.isActive ? 'Disable' : 'Enable'} Plugin
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main page ── */
export default function PluginsPage() {
  const [plugins,    setPlugins]    = useState<Plugin[]>([])
  const [loading,    setLoading]    = useState(true)
  const [query,      setQuery]      = useState('')
  const [catFilter,  setCatFilter]  = useState<string>('all')
  const [detail,     setDetail]     = useState<Plugin | null>(null)

  const SEED_PLUGINS: Plugin[] = [
    {
      id: 'browser',  name: 'Browser Control',    version: '1.0.0', author: 'KENUXA',
      description: 'Open URLs, search the web, and extract content from web pages using Playwright.',
      category: 'browser', isBuiltIn: true, isActive: true,
      capabilities: ['Open URLs', 'Web search', 'Page content extraction'],
      permissions: ['browser', 'network'],
    },
    {
      id: 'gmail',    name: 'Gmail Integration',  version: '1.0.0', author: 'KENUXA',
      description: 'Connect to Gmail to read, send, and manage emails with AI-powered summarization.',
      category: 'email', isBuiltIn: true, isActive: false,
      capabilities: ['Read emails', 'Send emails', 'AI summarization', 'Label management'],
      permissions: ['email', 'oauth'],
      configSchema: { GMAIL_CLIENT_ID: 'string', GMAIL_CLIENT_SECRET: 'string' },
    },
    {
      id: 'core',     name: 'KENUXA Core',         version: '1.0.0', author: 'KENUXA',
      description: 'Connect to the KENUXA CORE platform for AI processing, analytics, and shared data.',
      category: 'ai', isBuiltIn: true, isActive: true,
      capabilities: ['AI queries', 'Reach analytics', 'Event emission', 'Core auth'],
      permissions: ['network', 'core-api'],
      configSchema: { KENUXA_CORE_URL: 'string', KENUXA_SERVICE_KEY: 'string' },
    },
    {
      id: 'resend',   name: 'Resend Email',        version: '1.0.0', author: 'KENUXA',
      description: 'Send transactional emails using Resend API with full HTML template support.',
      category: 'email', isBuiltIn: true, isActive: true,
      capabilities: ['Send emails', 'HTML templates', 'Delivery tracking'],
      permissions: ['email', 'network'],
      configSchema: { RESEND_API_KEY: 'string' },
    },
    {
      id: 'notion',   name: 'Notion Sync',         version: '0.9.0', author: 'Community',
      description: 'Sync tasks, notes, and databases with Notion workspaces.',
      category: 'data', isBuiltIn: false, isActive: false,
      capabilities: ['Read pages', 'Create pages', 'Update databases'],
      permissions: ['network', 'oauth'],
      configSchema: { NOTION_TOKEN: 'string' },
    },
    {
      id: 'slack',    name: 'Slack Notifications', version: '1.0.0', author: 'Community',
      description: 'Send messages and notifications to Slack channels from voice commands.',
      category: 'integration', isBuiltIn: false, isActive: false,
      capabilities: ['Send messages', 'Channel management', 'File uploads'],
      permissions: ['network', 'oauth'],
      configSchema: { SLACK_BOT_TOKEN: 'string' },
    },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/commands?action=list_plugins')
      const j = await r.json()
      const apiPlugins: Plugin[] = j.data ?? []
      // Fall back to seed data when API returns empty (no DB configured yet)
      setPlugins(apiPlugins.length > 0 ? apiPlugins : SEED_PLUGINS)
    } catch {
      setPlugins(SEED_PLUGINS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    try {
      await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_plugin', pluginId: id, enabled: active }),
      })
      setPlugins(ps => ps.map(p => p.id === id ? { ...p, isActive: active } : p))
      toast.success(active ? 'Plugin enabled' : 'Plugin disabled')
    } catch {
      toast.error('Failed to update plugin')
    }
  }, [])

  const filtered = plugins.filter(p => {
    const matchesQuery = !query || p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(query.toLowerCase())
    const matchesCat = catFilter === 'all' || p.category === catFilter
    return matchesQuery && matchesCat
  })

  const enabledCount = plugins.filter(p => p.isActive).length
  const categories = ['all', ...Array.from(new Set(plugins.map(p => p.category)))]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Plugin Marketplace</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {enabledCount} active · {plugins.length} installed
          </p>
        </div>
        <a
          href="https://kenuxa.com/plugins"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-400
            hover:text-white hover:border-zinc-600 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Browse Registry
        </a>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search plugins…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200
              placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                catFilter === cat
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: plugins.length,                         color: 'text-white'        },
          { label: 'Active',     value: enabledCount,                             color: 'text-emerald-400'  },
          { label: 'Built-in',   value: plugins.filter(p => p.isBuiltIn).length,  color: 'text-indigo-400'  },
          { label: 'Community',  value: plugins.filter(p => !p.isBuiltIn).length, color: 'text-amber-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Plugin grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/30"
        >
          <Puzzle className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            {query ? `No plugins matching "${query}"` : 'No plugins'}
          </p>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                onToggle={handleToggle}
                onDetail={setDetail}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <DetailModal
            plugin={detail}
            onClose={() => setDetail(null)}
            onToggle={handleToggle}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
