'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Activity, Bell, User }  from 'lucide-react'
import { useOpsStore }  from '@/store/ops.store'
import { useSession }   from '@/hooks/useSession'
import { formatRelativeTime } from '@/lib/utils'
import type { VoiceState }    from '@/types/ops'

const STATE_LABELS: Record<VoiceState, { label: string; color: string }> = {
  idle:       { label: 'Standby',    color: 'text-zinc-600'  },
  listening:  { label: 'Listening',  color: 'text-emerald-400' },
  processing: { label: 'Thinking',   color: 'text-indigo-400'  },
  speaking:   { label: 'Speaking',   color: 'text-amber-400'   },
  error:      { label: 'Error',      color: 'text-red-400'     },
}

interface Props {
  onVoiceToggle: () => void
  title?:        string
}

export function TopBar({ onVoiceToggle, title }: Props) {
  const { voiceState, commandHistory, sidebarOpen } = useOpsStore()
  const { user } = useSession()

  const stateInfo = STATE_LABELS[voiceState]
  const lastCmd   = commandHistory[0]
  const isActive  = voiceState !== 'idle' && voiceState !== 'error'

  return (
    <header
      className="fixed top-0 right-0 z-20 h-16 border-b border-zinc-800/60
                 bg-[#050508]/95 backdrop-blur-sm flex items-center justify-between px-5"
      style={{ left: sidebarOpen ? 220 : 64, transition: 'left 0.3s' }}
    >
      {/* Left — page title */}
      <div>
        {title && <h1 className="text-sm font-semibold text-white">{title}</h1>}
        {lastCmd && (
          <p className="text-xs text-zinc-600 mt-0.5">
            Last: "{lastCmd.rawText.slice(0, 40)}"
            {lastCmd.createdAt && ` · ${formatRelativeTime(lastCmd.createdAt)}`}
          </p>
        )}
      </div>

      {/* Right — voice status + actions */}
      <div className="flex items-center gap-3">

        {/* Voice state indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={voiceState}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2"
          >
            <span className={`flex h-2 w-2 rounded-full ${
              isActive ? 'bg-emerald-400' : 'bg-zinc-700'
            }`}>
              {isActive && (
                <motion.span
                  className="absolute h-2 w-2 rounded-full bg-emerald-400 opacity-75"
                  animate={{ scale: [1, 2], opacity: [0.75, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </span>
            <span className={`text-xs font-medium ${stateInfo.color}`}>
              {stateInfo.label}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Voice toggle button */}
        <button
          onClick={onVoiceToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all border ${
            isActive
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
          }`}
        >
          {isActive
            ? <><Activity className="w-3 h-3" /> Active</>
            : <><Mic className="w-3 h-3" /> Activate</>
          }
        </button>

        {/* Notification bell (placeholder) */}
        <button className="relative text-zinc-600 hover:text-zinc-400 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
            {user?.email ? (
              <span className="text-[10px] font-bold text-indigo-300">
                {user.email[0]?.toUpperCase()}
              </span>
            ) : (
              <User className="w-3 h-3 text-indigo-400" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
