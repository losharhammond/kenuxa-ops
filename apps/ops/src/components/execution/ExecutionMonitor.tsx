'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Loader2, Clock, Globe, Mail,
  Brain, Database, Zap, Monitor, Search, Cpu,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import type { ExecPlan, ExecStep, ExecStepType } from '@/types/ops'

// ── Step type → icon mapping ───────────────────────────────────────────────────

const STEP_ICONS: Partial<Record<ExecStepType, React.ElementType>> = {
  web_search:          Search,
  browser_open:        Globe,
  browser_click:       Globe,
  browser_extract:     Globe,
  browser_screenshot:  Globe,
  email_read:          Mail,
  email_send:          Mail,
  email_draft:         Mail,
  desktop_open:        Monitor,
  desktop_screenshot:  Monitor,
  desktop_control:     Monitor,
  memory_read:         Database,
  memory_write:        Database,
  ai_process:          Brain,
  intent_analysis:     Brain,
  task_decomposition:  Brain,
  kenuxa_query:        Cpu,
  workflow_run:        Zap,
  result_verify:       CheckCircle2,
  speak:               Cpu,
  http_request:        Globe,
  wait:                Clock,
}

const STEP_COLORS: Partial<Record<ExecStepType, string>> = {
  web_search:         'text-blue-400 bg-blue-500/10 border-blue-500/20',
  browser_open:       'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  browser_extract:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  browser_click:      'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  browser_screenshot: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  email_read:         'text-blue-400 bg-blue-500/10 border-blue-500/20',
  email_send:         'text-blue-400 bg-blue-500/10 border-blue-500/20',
  email_draft:        'text-blue-400 bg-blue-500/10 border-blue-500/20',
  desktop_open:       'text-purple-400 bg-purple-500/10 border-purple-500/20',
  desktop_control:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  memory_read:        'text-violet-400 bg-violet-500/10 border-violet-500/20',
  memory_write:       'text-violet-400 bg-violet-500/10 border-violet-500/20',
  ai_process:         'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  kenuxa_query:       'text-amber-400 bg-amber-500/10 border-amber-500/20',
  result_verify:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

function getStepColor(type: ExecStepType): string {
  return STEP_COLORS[type] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'
}

// ── Status icon ────────────────────────────────────────────────────────────────

function StepStatusIcon({ status }: { status: ExecStep['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
  if (status === 'failed')    return <XCircle      className="w-3.5 h-3.5 text-red-400 shrink-0" />
  if (status === 'running')   return <Loader2      className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
  return <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />
}

// ── Single step row ────────────────────────────────────────────────────────────

function StepRow({ step, isCurrent }: { step: ExecStep; isCurrent: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const Icon  = STEP_ICONS[step.type] ?? Cpu
  const color = getStepColor(step.type)

  const hasOutput = step.output !== undefined && step.status === 'completed'
  const outputStr = hasOutput ? JSON.stringify(step.output, null, 2).slice(0, 400) : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border transition-all ${
        isCurrent && step.status === 'running'
          ? 'border-indigo-500/30 bg-indigo-500/5'
          : step.status === 'completed'
            ? 'border-zinc-800/60 bg-zinc-900/20'
            : step.status === 'failed'
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-zinc-800 bg-zinc-900/20'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Step number */}
        <span className="text-[10px] font-bold text-zinc-700 w-4 shrink-0 text-right">
          {step.index + 1}
        </span>

        {/* Tool icon */}
        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-3 h-3" />
        </div>

        {/* Label + type */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${
            step.status === 'running' ? 'text-white' : 'text-zinc-300'
          }`}>
            {step.label}
          </p>
          <p className="text-[10px] text-zinc-600">{step.type.replace(/_/g, ' ')} · {step.tool}</p>
        </div>

        {/* Duration */}
        {step.durationMs != null && (
          <span className="text-[10px] text-zinc-700 shrink-0">
            {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}

        {/* Status icon */}
        <StepStatusIcon status={step.status} />

        {/* Expand output */}
        {hasOutput && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            {expanded
              ? <ChevronDown    className="w-3.5 h-3.5" />
              : <ChevronRight   className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Error */}
      {step.error && (
        <div className="mx-3 mb-2.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[10px] text-red-400">{step.error}</p>
        </div>
      )}

      {/* Output preview */}
      <AnimatePresence>
        {expanded && outputStr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <pre className="mx-3 mb-2.5 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800
              text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {outputStr}{outputStr.length === 400 ? '…' : ''}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Plan status badge ──────────────────────────────────────────────────────────

function PlanStatusBadge({ status }: { status: ExecPlan['status'] }) {
  const map = {
    planning:  { cls: 'text-zinc-400 bg-zinc-800 border-zinc-700',               label: 'Planning'  },
    executing: { cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',   label: 'Executing' },
    completed: { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Completed' },
    failed:    { cls: 'text-red-400 bg-red-500/10 border-red-500/30',             label: 'Failed'    },
    cancelled: { cls: 'text-zinc-500 bg-zinc-800 border-zinc-700',               label: 'Cancelled' },
  }
  const cfg = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-medium ${cfg.cls}`}>
      {status === 'executing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {cfg.label}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  plan:       ExecPlan
  compact?:   boolean   // for dashboard widget mode
}

export function ExecutionMonitor({ plan, compact = false }: Props) {
  const completedSteps = plan.steps.filter(s => s.status === 'completed').length
  const totalSteps     = plan.steps.length
  const progress       = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <div className={`rounded-2xl border ${
      plan.status === 'executing'
        ? 'border-indigo-500/20 bg-gradient-to-b from-indigo-950/10 to-zinc-950/20'
        : plan.status === 'completed'
          ? 'border-emerald-500/15 bg-zinc-900/30'
          : plan.status === 'failed'
            ? 'border-red-500/15 bg-zinc-900/30'
            : 'border-zinc-800 bg-zinc-900/30'
    }`}>

      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-zinc-800/60">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <PlanStatusBadge status={plan.status} />
            {plan.durationMs != null && plan.status !== 'executing' && (
              <span className="text-[10px] text-zinc-600">
                {(plan.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white truncate">"{plan.goal.slice(0, 80)}"</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {plan.id.slice(0, 8)} · {completedSteps}/{totalSteps} steps
          </p>
        </div>

        {/* Progress ring (compact) or bar */}
        {compact && plan.status === 'executing' ? (
          <div className="relative w-8 h-8 shrink-0">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="none" stroke="#27272a" strokeWidth="3" />
              <circle
                cx="16" cy="16" r="12"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - progress / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-indigo-400">
              {Math.round(progress)}%
            </span>
          </div>
        ) : null}
      </div>

      {/* Progress bar */}
      {!compact && totalSteps > 0 ? (
        <div className="mx-4 my-3">
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                plan.status === 'failed' ? 'bg-red-500' :
                plan.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-zinc-600">{completedSteps} done</span>
            <span className="text-[10px] text-zinc-600">{totalSteps - completedSteps} remaining</span>
          </div>
        </div>
      ) : null}

      {/* Steps */}
      {(!compact || plan.steps.length > 0) && (
        <div className={`px-3 pb-3 space-y-1.5 ${compact ? 'pt-2 max-h-48 overflow-y-auto' : ''}`}>
          {plan.status === 'planning' && plan.steps.length === 0 ? (
            <div className="flex items-center gap-2 py-3 px-3">
              <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <p className="text-xs text-zinc-500">Decomposing task…</p>
            </div>
          ) : (
            plan.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                isCurrent={i === plan.currentStep}
              />
            ))
          )}
        </div>
      )}

      {/* Result summary */}
      {plan.status === 'completed' && Boolean(plan.result) && !compact && (
        <div className="mx-4 mb-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
            Execution Result
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {typeof plan.result === 'string'
              ? (plan.result as string).slice(0, 300)
              : JSON.stringify(plan.result ?? '').slice(0, 300)}
          </p>
        </div>
      )}

      {/* Error */}
      {plan.status === 'failed' && plan.error && (
        <div className="mx-4 mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-[10px] font-semibold text-red-400 mb-1">Execution Failed</p>
          <p className="text-xs text-zinc-400">{plan.error}</p>
        </div>
      )}
    </div>
  )
}
