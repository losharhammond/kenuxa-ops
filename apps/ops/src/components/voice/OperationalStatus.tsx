'use client'

/**
 * KENUXA OPS — Operational Status Display (Phase 5.2)
 *
 * Shows one of 10 real-time operational states with
 * animated icon, label, and state-specific color.
 *
 * States:
 *   😴 sleeping       — low-power wake word mode
 *   🎤 listening      — capturing speech
 *   🧠 processing     — classifying + routing
 *   ⚡ executing      — running steps
 *   🌐 browser_active — Playwright worker running
 *   📧 email_sending  — Outlook Graph API
 *   🖥 desktop_active — Electron bridge action
 *   📁 file_opening   — file system operation
 *   ✅ completed      — verified + confirmed
 *   ⏳ follow_up      — session open, waiting
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { OperationalStatus }   from '@/types/ops'

const STATUS_CONFIG: Record<OperationalStatus, {
  emoji:    string
  label:    string
  detail?:  string
  color:    string
  bg:       string
  border:   string
  pulse:    boolean
  spin:     boolean
}> = {
  sleeping: {
    emoji: '😴', label: 'Sleeping',
    detail: 'Say "Hey Kenuxa" to activate',
    color: 'text-zinc-500', bg: 'bg-zinc-900/40', border: 'border-zinc-800',
    pulse: false, spin: false,
  },
  listening: {
    emoji: '🎤', label: 'Listening',
    detail: 'Speak your command…',
    color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-500/30',
    pulse: true, spin: false,
  },
  processing: {
    emoji: '🧠', label: 'Processing',
    detail: 'Classifying intent…',
    color: 'text-violet-400', bg: 'bg-violet-950/20', border: 'border-violet-500/30',
    pulse: false, spin: true,
  },
  executing: {
    emoji: '⚡', label: 'Executing',
    detail: 'Running pipeline…',
    color: 'text-indigo-400', bg: 'bg-indigo-950/20', border: 'border-indigo-500/30',
    pulse: true, spin: false,
  },
  browser_active: {
    emoji: '🌐', label: 'Browser Active',
    detail: 'Playwright worker running…',
    color: 'text-sky-400', bg: 'bg-sky-950/20', border: 'border-sky-500/30',
    pulse: true, spin: false,
  },
  email_sending: {
    emoji: '📧', label: 'Sending Email',
    detail: 'Outlook Graph API…',
    color: 'text-cyan-400', bg: 'bg-cyan-950/20', border: 'border-cyan-500/30',
    pulse: true, spin: false,
  },
  desktop_active: {
    emoji: '🖥', label: 'Desktop Active',
    detail: 'Electron bridge executing…',
    color: 'text-orange-400', bg: 'bg-orange-950/20', border: 'border-orange-500/30',
    pulse: true, spin: false,
  },
  file_opening: {
    emoji: '📁', label: 'Opening File',
    detail: 'File system operation…',
    color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/30',
    pulse: true, spin: false,
  },
  completed: {
    emoji: '✅', label: 'Completed',
    detail: 'Action verified',
    color: 'text-emerald-400', bg: 'bg-emerald-950/10', border: 'border-emerald-500/20',
    pulse: false, spin: false,
  },
  follow_up: {
    emoji: '⏳', label: 'Ready',
    detail: 'Anything else?',
    color: 'text-teal-400', bg: 'bg-teal-950/20', border: 'border-teal-500/30',
    pulse: true, spin: false,
  },
}

interface Props {
  status:       OperationalStatus
  domain?:      string | null
  sessionInfo?: {
    commandCount: number
    lastUrl?:     string
    lastEmail?:   string
    sessionSec?:  number
  }
  compact?: boolean
}

export function OperationalStatus({ status, domain, sessionInfo, compact = false }: Props) {
  const cfg = STATUS_CONFIG[status]

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.color}`}
        >
          <span>{cfg.emoji}</span>
          <span>{cfg.label}</span>
          {cfg.pulse && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-current inline-block"
            />
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}
      >
        <div className="flex items-center gap-3">
          {/* State icon with animation */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
            border ${cfg.border} relative overflow-hidden`}
          >
            {cfg.spin ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-xl border-2 border-t-transparent"
                style={{ borderColor: 'currentColor' }}
              />
            ) : null}
            <span role="img" aria-label={cfg.label}>{cfg.emoji}</span>
            {cfg.pulse && (
              <motion.div
                className={`absolute inset-0 rounded-xl ${cfg.bg}`}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          {/* Label + detail */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
              {cfg.pulse && (
                <motion.span
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${cfg.bg} border ${cfg.border} inline-block`}
                  style={{ backgroundColor: 'currentColor' }}
                />
              )}
              {domain && (
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  via {domain}
                </span>
              )}
            </div>
            {cfg.detail && (
              <p className="text-xs text-zinc-500 mt-0.5">{cfg.detail}</p>
            )}
          </div>
        </div>

        {/* Session context strip */}
        {sessionInfo && (sessionInfo.commandCount > 0 || sessionInfo.lastUrl || sessionInfo.lastEmail) && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center gap-4 flex-wrap text-[11px] text-zinc-600">
            {sessionInfo.commandCount > 0 && (
              <span>{sessionInfo.commandCount} command{sessionInfo.commandCount !== 1 ? 's' : ''} this session</span>
            )}
            {sessionInfo.lastUrl && (
              <span className="text-sky-600 truncate max-w-[140px]">🌐 {sessionInfo.lastUrl}</span>
            )}
            {sessionInfo.lastEmail && (
              <span className="text-cyan-600 truncate max-w-[140px]">📧 {sessionInfo.lastEmail}</span>
            )}
            {sessionInfo.sessionSec !== undefined && sessionInfo.sessionSec > 0 && (
              <span className="ml-auto text-zinc-700">
                {Math.floor(sessionInfo.sessionSec / 60)}:{String(sessionInfo.sessionSec % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
