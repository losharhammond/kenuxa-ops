'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence }           from 'framer-motion'
import {
  Zap, Plus, Play, Pause, Trash2, ChevronRight,
  Clock, Globe, MessageSquare, CheckCircle2,
  XCircle, AlertTriangle, Loader2, X,
  Mail, Database, Code2, Timer,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Workflow }      from '@/types/ops'
import toast                  from 'react-hot-toast'

/* ── Trigger type icons ── */
const TRIGGER_ICONS: Record<string, React.ElementType> = {
  cron:    Clock,
  event:   Zap,
  manual:  Play,
  webhook: Globe,
  voice:   MessageSquare,
}

/* ── Step type icons ── */
const STEP_ICONS: Record<string, React.ElementType> = {
  email:   Mail,
  command: Zap,
  memory:  Database,
  http:    Globe,
  wait:    Timer,
  condition: Code2,
}

/* ── Status badge ── */
function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, { text: string; cls: string; icon: React.ElementType }> = {
    completed: { text: 'Completed', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    failed:    { text: 'Failed',    cls: 'text-red-400 bg-red-500/10 border-red-500/20',             icon: XCircle       },
    running:   { text: 'Running',   cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',    icon: Loader2       },
    idle:      { text: 'Idle',      cls: 'text-zinc-500 bg-zinc-800 border-zinc-700',                icon: AlertTriangle },
  }
  const cfg = map[status ?? 'idle'] ?? map.idle!
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium ${cfg.cls}`}>
      <Icon className={`w-2.5 h-2.5 ${status === 'running' ? 'animate-spin' : ''}`} />
      {cfg.text}
    </span>
  )
}

/* ── Workflow card ── */
function WorkflowCard({
  workflow,
  onToggle,
  onDelete,
  onRun,
}: {
  workflow: Workflow
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onRun: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const TriggerIcon = TRIGGER_ICONS[workflow.triggerType] ?? Zap

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-zinc-900/40 overflow-hidden transition-all ${
        workflow.isActive ? 'border-zinc-700' : 'border-zinc-800'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        {/* Active indicator */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          workflow.isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'
        }`} />

        {/* Trigger icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          workflow.isActive ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600'
        }`}>
          <TriggerIcon className="w-3.5 h-3.5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{workflow.name}</p>
            <StatusBadge status={workflow.lastStatus} />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {workflow.triggerType} · {workflow.runCount} runs
            {workflow.lastRunAt && ` · Last: ${formatRelativeTime(workflow.lastRunAt)}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onRun(workflow.id)}
            title="Run now"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 border border-zinc-700
              text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          >
            <Play className="w-3 h-3" />
          </button>
          <button
            onClick={() => onToggle(workflow.id, !workflow.isActive)}
            title={workflow.isActive ? 'Pause' : 'Activate'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
              workflow.isActive
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-amber-400'
            }`}
          >
            {workflow.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => onDelete(workflow.id)}
            title="Delete"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 border border-zinc-700
              text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 border border-zinc-700
              text-zinc-500 hover:text-white transition-all"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-zinc-800"
          >
            <div className="p-4 space-y-2">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">
                Steps ({workflow.steps.length})
              </p>
              {workflow.steps.map((step, i) => {
                const StepIcon = STEP_ICONS[step.type] ?? Code2
                return (
                  <div key={step.id ?? i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-700 w-4 shrink-0">{i + 1}</span>
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <StepIcon className="w-3 h-3 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300">{step.type}</p>
                      {Boolean(step.config?.subject) && (
                        <p className="text-[10px] text-zinc-600 truncate">"{String(step.config.subject)}"</p>
                      )}
                      {Boolean(step.config?.command) && (
                        <p className="text-[10px] text-zinc-600 truncate">cmd: {String(step.config.command)}</p>
                      )}
                    </div>
                    {step.label && (
                      <span className="text-[10px] text-zinc-600 shrink-0 truncate max-w-[80px]">{step.label}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Create workflow modal ── */
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (wf: Partial<Workflow>) => void }) {
  const [name,        setName]        = useState('')
  const [triggerType, setTriggerType] = useState<string>('manual')
  const [cronExpr,    setCronExpr]    = useState('0 9 * * 1-5')
  const [description, setDescription] = useState('')

  const TRIGGERS = [
    { value: 'manual',  label: 'Manual',   desc: 'Run on demand or via voice' },
    { value: 'cron',    label: 'Schedule', desc: 'Run on a cron schedule' },
    { value: 'event',   label: 'Event',    desc: 'Trigger on system events' },
    { value: 'voice',   label: 'Voice',    desc: 'Trigger from voice command' },
    { value: 'webhook', label: 'Webhook',  desc: 'External HTTP trigger' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate({
      name:        name.trim(),
      description: description.trim(),
      triggerType: triggerType as Workflow['triggerType'],
      triggerConfig: triggerType === 'cron' ? { cron: cronExpr } : {},
      steps:       [],
      isActive:    false,
      runCount:    0,
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
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="font-semibold text-white">New Workflow</h3>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Workflow name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Morning Briefing, Daily Report…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Trigger type */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Trigger type</label>
            <div className="grid grid-cols-3 gap-2">
              {TRIGGERS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTriggerType(t.value)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all ${
                    triggerType === t.value
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-700 bg-zinc-800/60 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  <span className="text-xs font-semibold">{t.label}</span>
                  <span className="text-[9px] leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cron expression */}
          {triggerType === 'cron' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-xs text-zinc-500 block mb-1.5">Cron expression</label>
              <input
                value={cronExpr}
                onChange={e => setCronExpr(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-200
                  placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
              />
              <p className="text-[10px] text-zinc-600 mt-1">e.g. "0 9 * * 1-5" = weekdays at 9am</p>
            </motion.div>
          )}

          <p className="text-xs text-zinc-600 bg-zinc-800/60 rounded-xl px-3 py-2.5">
            💡 Steps can be added after creation via voice: <span className="text-zinc-400">"Add a step to [workflow name]"</span>
          </p>

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
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 text-sm font-semibold text-white
                hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Create Workflow
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Main page ── */
export default function WorkflowsPage() {
  const [workflows,   setWorkflows]   = useState<Workflow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)
  const [filter,      setFilter]      = useState<'all' | 'active' | 'inactive'>('all')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/automation')
      const j = await r.json()
      setWorkflows(j.data ?? [])
    } catch {
      toast.error('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    try {
      await fetch('/api/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: active ? 'activate' : 'deactivate' }),
      })
      setWorkflows(wfs => wfs.map(w => w.id === id ? { ...w, isActive: active } : w))
      toast.success(active ? 'Workflow activated' : 'Workflow paused')
    } catch {
      toast.error('Failed to update workflow')
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this workflow?')) return
    try {
      await fetch('/api/automation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setWorkflows(wfs => wfs.filter(w => w.id !== id))
      toast.success('Workflow deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }, [])

  const handleRun = useCallback(async (id: string) => {
    try {
      await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', workflowId: id }),
      })
      toast.success('Workflow started')
      setTimeout(load, 1500)
    } catch {
      toast.error('Failed to run workflow')
    }
  }, [load])

  const handleCreate = useCallback(async (wf: Partial<Workflow>) => {
    try {
      const r = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...wf }),
      })
      const j = await r.json()
      if (j.data) {
        setWorkflows(wfs => [j.data, ...wfs])
        toast.success('Workflow created')
      }
      setShowCreate(false)
    } catch {
      toast.error('Failed to create workflow')
    }
  }, [])

  const filtered = workflows.filter(w =>
    filter === 'all'      ? true :
    filter === 'active'   ? w.isActive :
    !w.isActive
  )

  const activeCount = workflows.filter(w => w.isActive).length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Workflow Center</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {activeCount} active · {workflows.length} total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-sm font-semibold text-white
            hover:bg-amber-500 transition-all shadow-lg shadow-amber-600/20"
        >
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',    value: workflows.length, color: 'text-white' },
          { label: 'Active',   value: activeCount,      color: 'text-emerald-400' },
          { label: 'Total Runs', value: workflows.reduce((s, w) => s + (w.runCount ?? 0), 0), color: 'text-indigo-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-zinc-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize ${
              filter === f
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Workflows list */}
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
          <Zap className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-1">
            {filter !== 'all' ? `No ${filter} workflows` : 'No workflows yet'}
          </p>
          <p className="text-xs text-zinc-700">
            {filter !== 'all' ? 'Change filter or create a new workflow' : 'Create your first automation'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-500/20 text-xs text-amber-400
                hover:bg-amber-600/30 transition-all"
            >
              <Plus className="w-3 h-3 inline mr-1" /> Create Workflow
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(wf => (
              <WorkflowCard
                key={wf.id}
                workflow={wf}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onRun={handleRun}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
