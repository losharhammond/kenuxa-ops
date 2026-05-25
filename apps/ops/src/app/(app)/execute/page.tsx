'use client'

import { useState, useCallback }     from 'react'
import { motion, AnimatePresence }   from 'framer-motion'
import {
  Cpu, Play, Square, Keyboard, AlertCircle,
  Globe, Mail, Monitor, Brain, Search, Zap,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react'
import { useExecution }        from '@/hooks/useExecution'
import { useOpsStore }         from '@/store/ops.store'
import { ExecutionMonitor }    from '@/components/execution/ExecutionMonitor'
import { formatRelativeTime }  from '@/lib/utils'

// ── Quick-action templates ─────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    icon: Search,    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    label: 'Research & Report',
    prompt: 'Search for the latest AI developments and create a summary report',
  },
  {
    icon: Mail,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    label: 'Inbox Summary',
    prompt: 'Read my emails and summarize the most important ones',
  },
  {
    icon: Globe,     color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    label: 'Web Intelligence',
    prompt: 'Search for competitor pricing information and extract key data points',
  },
  {
    icon: Brain,     color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    label: 'Analyse & Decide',
    prompt: 'Analyse our recent performance data and recommend three key actions',
  },
  {
    icon: Monitor,   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    label: 'System Report',
    prompt: 'Check all connected systems and generate a status report',
  },
  {
    icon: Zap,       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    label: 'Run Workflow',
    prompt: 'Run the morning briefing workflow and send me the results',
  },
]

// ── Pipeline visualization legend (Phase 4 — 7 steps) ────────────────────────

const PIPELINE_STAGES = [
  { n: '01', label: 'CORE Auth',         color: 'border-rose-500/40    text-rose-400'    },
  { n: '02', label: 'Intent Analysis',   color: 'border-indigo-500/40  text-indigo-400'  },
  { n: '03', label: 'System Routing',    color: 'border-violet-500/40  text-violet-400'  },
  { n: '04', label: 'Build DAG',         color: 'border-blue-500/40    text-blue-400'    },
  { n: '05', label: 'Execute',           color: 'border-cyan-500/40    text-cyan-400'    },
  { n: '06', label: 'Aggregate',         color: 'border-teal-500/40    text-teal-400'    },
  { n: '07', label: 'Memory Update',     color: 'border-emerald-500/40 text-emerald-400' },
]

export default function ExecuteConsolePage() {
  const { executions, activeExecution } = useOpsStore()
  const { start, abort, running }       = useExecution()

  const [input,         setInput]         = useState('')
  const [showQuick,     setShowQuick]     = useState(true)
  const [showHistory,   setShowHistory]   = useState(false)
  const [selectedPlan,  setSelectedPlan]  = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    if (!input.trim() || running) return
    const text = input.trim()
    setInput('')
    await start(text)
  }, [input, running, start])

  const handleQuick = useCallback(async (prompt: string) => {
    if (running) return
    await start(prompt)
  }, [running, start])

  const completedCount = executions.filter(e => e.status === 'completed').length
  const failedCount    = executions.filter(e => e.status === 'failed').length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`rounded-2xl border p-5 flex items-start justify-between transition-all ${
          running
            ? 'border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-violet-950/20'
            : 'border-zinc-800 bg-zinc-900/30'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
              running
                ? 'bg-indigo-500/20 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                : 'bg-zinc-800 border-zinc-700'
            }`}>
              <Cpu className={`w-4 h-4 ${running ? 'text-indigo-400' : 'text-zinc-500'}`} />
            </div>
            <h2 className="text-lg font-bold text-white">Execution Console</h2>
            {running && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              >
                ACTIVE
              </motion.span>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            {running
              ? 'Executing multi-step plan — real actions in progress'
              : 'Define a goal · KENUXA decomposes it into real execution steps'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-center shrink-0">
          {[
            { label: 'Total',     value: executions.length,  color: 'text-white' },
            { label: 'Success',   value: completedCount,     color: 'text-emerald-400' },
            { label: 'Failed',    value: failedCount,        color: 'text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-zinc-600">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pipeline stages diagram */}
      <div className="hidden sm:flex items-center gap-1.5">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.n} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-medium flex-1 ${
              running ? stage.color : 'border-zinc-800 text-zinc-600'
            }`}>
              <span className="font-black opacity-60">{stage.n}</span>
              <span className="truncate">{stage.label}</span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={`w-3 h-px ${running ? 'bg-indigo-500/40' : 'bg-zinc-800'} shrink-0`} />
            )}
          </div>
        ))}
      </div>

      {/* Command input */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Keyboard className="w-3.5 h-3.5 text-zinc-600" />
          <p className="text-xs text-zinc-500 font-medium">EXECUTION GOAL</p>
          {running && (
            <span className="ml-auto text-[10px] text-zinc-600">Pipeline running…</span>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleRun() }
            }}
            placeholder="Describe a goal with real-world actions…
e.g. 'Find agricultural exporters in Ghana and email me a report'"
            rows={3}
            disabled={running}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-zinc-200
              placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
              transition-all resize-none disabled:opacity-50"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={running ? abort : handleRun}
              disabled={!running && !input.trim()}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                running
                  ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {running
                ? <><Square className="w-4 h-4" /> Stop</>
                : <><Play  className="w-4 h-4" /> Execute</>}
            </button>
            {!running && (
              <p className="text-[10px] text-zinc-700 text-center">⏎ to run</p>
            )}
          </div>
        </div>
      </div>

      {/* Active execution */}
      <AnimatePresence>
        {activeExecution && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Execution</p>
            </div>
            <ExecutionMonitor plan={activeExecution} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions */}
      <div>
        <button
          onClick={() => setShowQuick(v => !v)}
          className="flex items-center gap-2 w-full text-left mb-3"
        >
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</p>
          {showQuick
            ? <ChevronUp   className="w-3.5 h-3.5 text-zinc-700 ml-auto" />
            : <ChevronDown className="w-3.5 h-3.5 text-zinc-700 ml-auto" />}
        </button>
        <AnimatePresence>
          {showQuick && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {QUICK_ACTIONS.map(({ icon: Icon, color, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => void handleQuick(prompt)}
                    disabled={running}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/30
                      hover:border-zinc-700 hover:bg-zinc-900/60 transition-all text-left group
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                        {label}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed">
                        {prompt.slice(0, 60)}…
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Execution history */}
      {executions.filter(e => e.id !== activeExecution?.id).length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 w-full text-left mb-3"
          >
            <Clock className="w-3.5 h-3.5 text-zinc-700" />
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Execution History</p>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              {executions.filter(e => e.id !== activeExecution?.id).length}
            </span>
            {showHistory
              ? <ChevronUp   className="w-3.5 h-3.5 text-zinc-700 ml-auto" />
              : <ChevronDown className="w-3.5 h-3.5 text-zinc-700 ml-auto" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3"
              >
                {executions
                  .filter(e => e.id !== activeExecution?.id)
                  .slice(0, 10)
                  .map(plan => (
                    <div key={plan.id}>
                      {selectedPlan === plan.id ? (
                        <ExecutionMonitor plan={plan} />
                      ) : (
                        <button
                          onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-zinc-800
                            bg-zinc-900/30 hover:bg-zinc-900/60 transition-all text-left"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            plan.status === 'completed' ? 'bg-emerald-400' :
                            plan.status === 'failed'    ? 'bg-red-400' :
                            plan.status === 'cancelled' ? 'bg-zinc-600' :
                            'bg-indigo-400'
                          }`} />
                          <p className="flex-1 text-xs text-zinc-400 truncate">
                            "{plan.goal.slice(0, 70)}"
                          </p>
                          <span className="text-[10px] text-zinc-600 shrink-0">
                            {plan.steps.length} steps
                          </span>
                          {plan.completedAt && (
                            <span className="text-[10px] text-zinc-700 shrink-0 ml-2">
                              {formatRelativeTime(plan.completedAt)}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {executions.length === 0 && !running && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-12 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20
            flex items-center justify-center mx-auto mb-4">
            <Cpu className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-2">No executions yet</h3>
          <p className="text-sm text-zinc-500 mb-1">
            Type a goal above or use a Quick Action
          </p>
          <p className="text-xs text-zinc-700">
            KENUXA will decompose it into atomic steps and execute them in real-time
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <AlertCircle className="w-3 h-3 text-amber-500/60" />
            <p className="text-[10px] text-zinc-600">
              All actions are real and traceable — confirm sensitive operations before running
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
