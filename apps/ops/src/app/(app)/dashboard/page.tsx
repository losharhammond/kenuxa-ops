'use client'

import { useState, useEffect } from 'react'
import { motion }      from 'framer-motion'
import Link            from 'next/link'
import {
  Mic, Zap, Database, Mail, Clock, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, Activity,
  Brain, Cpu,
} from 'lucide-react'
import { useOpsStore }         from '@/store/ops.store'
import { ExecutionMonitor }    from '@/components/execution/ExecutionMonitor'
import { formatRelativeTime }  from '@/lib/utils'
import type { OpsCommand, Workflow, OpsTask } from '@/types/ops'

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </motion.div>
  )
}

function CommandRow({ cmd }: { cmd: OpsCommand }) {
  const statusIcon = cmd.status === 'completed'
    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    : cmd.status === 'failed'
      ? <XCircle className="w-3.5 h-3.5 text-red-400" />
      : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      {statusIcon}
      <p className="flex-1 text-xs text-zinc-300 truncate">"{cmd.rawText}"</p>
      <span className="text-xs text-zinc-600 shrink-0">{formatRelativeTime(cmd.createdAt)}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { commandHistory, voiceState, activeExecution, executions } = useOpsStore()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [tasks,     setTasks]     = useState<OpsTask[]>([])
  const [coreUp,    setCoreUp]    = useState<boolean | null>(null)

  useEffect(() => {
    // Fetch workflows
    fetch('/api/automation')
      .then(r => r.json())
      .then((j: { data?: Workflow[] }) => setWorkflows(j.data ?? []))
      .catch(() => {})

    // Fetch tasks
    fetch('/api/memory?type=fact')
      .then(r => r.json())
      .then(() => {})
      .catch(() => {})

    // Ping CORE
    fetch('/api/commands?action=ping_core')
      .then(r => setCoreUp(r.ok))
      .catch(() => setCoreUp(false))
  }, [])

  const completedCmds  = commandHistory.filter(c => c.status === 'completed').length
  const activeWorkflows = workflows.filter(w => w.isActive).length
  const isVoiceActive  = voiceState !== 'idle' && voiceState !== 'error'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`rounded-2xl border p-6 flex items-center justify-between ${
          isVoiceActive
            ? 'border-emerald-500/25 bg-emerald-500/5'
            : 'border-zinc-800 bg-zinc-900/30'
        }`}
      >
        <div>
          <h2 className="text-lg font-bold text-white mb-1">
            {isVoiceActive ? '🎙️ Voice Active' : 'Operations Overview'}
          </h2>
          <p className="text-sm text-zinc-500">
            {isVoiceActive
              ? `Status: ${voiceState} · Say a command to execute`
              : 'Say "Hey Kenuxa" to activate · All systems operational'}
          </p>
        </div>
        <Link
          href="/voice"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
        >
          <Mic className="w-4 h-4" /> Voice Console
        </Link>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Commands Today"
          value={commandHistory.length}
          color="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
          sub={`${completedCmds} completed`}
        />
        <StatCard
          icon={Zap}
          label="Active Workflows"
          value={activeWorkflows}
          color="bg-amber-500/10 border border-amber-500/20 text-amber-400"
          sub={`${workflows.length} total`}
        />
        <StatCard
          icon={Cpu}
          label="Voice Engine"
          value={isVoiceActive ? 'Active' : 'Standby'}
          color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          sub={voiceState}
        />
        <StatCard
          icon={Brain}
          label="CORE Status"
          value={coreUp === null ? '—' : coreUp ? 'Connected' : 'Offline'}
          color={`${coreUp ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} border`}
          sub="KENUXA CORE"
        />
      </div>

      {/* Active Execution Monitor */}
      {(activeExecution || executions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" /> Execution Pipeline
            </h3>
            <Link href="/execute" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Mission Control <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeExecution ? (
            <ExecutionMonitor plan={activeExecution} compact />
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">
                  {executions[0]?.goal.slice(0, 60)}{executions[0]?.goal.length ?? 0 > 60 ? '…' : ''}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  Last execution · {executions[0]?.steps.length ?? 0} steps · {executions[0]?.status}
                </p>
              </div>
              <Link href="/execute"
                className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
              >
                View →
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Command history */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" /> Recent Commands
            </h3>
            <Link href="/voice" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {commandHistory.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-600">No commands yet. Say "Hey Kenuxa" to start.</p>
            </div>
          ) : (
            <div>
              {commandHistory.slice(0, 8).map((cmd, i) => (
                <CommandRow key={cmd.id ?? i} cmd={cmd} />
              ))}
            </div>
          )}
        </div>

        {/* Workflows */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-500" /> Workflows
            </h3>
            <Link href="/workflows" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {workflows.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-600">No workflows yet.</p>
              <Link href="/workflows" className="text-xs text-indigo-400 mt-2 inline-block">Create one →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.slice(0, 6).map(wf => (
                <div key={wf.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${wf.isActive ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{wf.name}</p>
                    <p className="text-[10px] text-zinc-600">{wf.triggerType} · {wf.runCount} runs</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    wf.lastStatus === 'completed' ? 'text-emerald-400 bg-emerald-500/10' :
                    wf.lastStatus === 'failed'    ? 'text-red-400 bg-red-500/10' :
                    'text-zinc-500 bg-zinc-800'
                  }`}>
                    {wf.lastStatus ?? 'idle'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/voice',     icon: Mic,       label: 'Voice Console',      color: 'text-emerald-400' },
            { href: '/execute',   icon: Cpu,       label: 'Execute Pipeline',   color: 'text-indigo-400'  },
            { href: '/email',     icon: Mail,      label: 'Email Hub',          color: 'text-blue-400'    },
            { href: '/workflows', icon: Zap,       label: 'Workflows',          color: 'text-amber-400'   },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all group"
            >
              <Icon className={`w-4 h-4 shrink-0 ${color}`} />
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
