'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mic2, Volume2 }    from 'lucide-react'
import type { OpsCommand }         from '@/types/ops'

interface Props {
  transcript:   string
  interimText:  string
  commands:     OpsCommand[]
}

function getCommandIcon(intent: string) {
  const icons: Record<string, React.ElementType> = {
    send_email: () => <span>📧</span>,
    read_emails: () => <span>📬</span>,
    search_web: () => <span>🔍</span>,
    open_url: () => <span>🌐</span>,
    open_app: () => <span>💻</span>,
    create_task: () => <span>✅</span>,
    query_reach: () => <span>🧠</span>,
    remember: () => <span>💾</span>,
    recall: () => <span>🔮</span>,
  }
  const Icon = icons[intent] ?? (() => <Brain className="w-3 h-3" />)
  return <Icon />
}

export function TranscriptFeed({ transcript, interimText, commands }: Props) {
  return (
    <div className="w-full space-y-3">
      {/* Interim transcript */}
      <AnimatePresence>
        {interimText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800"
          >
            <Mic2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
            <p className="text-sm text-zinc-400 italic">{interimText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final transcript */}
      <AnimatePresence>
        {transcript && !interimText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
          >
            <Mic2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300">"{transcript}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command history */}
      <div className="space-y-2">
        {commands.slice(0, 8).map((cmd) => (
          <motion.div
            key={cmd.id ?? cmd.createdAt}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${
              cmd.status === 'completed'
                ? 'bg-zinc-900/40 border-zinc-800/60'
                : cmd.status === 'failed'
                  ? 'bg-red-500/5 border-red-500/15'
                  : 'bg-zinc-900/40 border-zinc-800'
            }`}
          >
            <div className="shrink-0 mt-0.5 text-base">
              {getCommandIcon(cmd.intent ?? 'unknown')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-zinc-300 truncate">"{cmd.rawText}"</p>
              {cmd.speakText && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Volume2 className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <p className="text-zinc-500 truncate">{cmd.speakText}</p>
                </div>
              )}
              {cmd.error && (
                <p className="text-red-400 truncate mt-1">{cmd.error}</p>
              )}
            </div>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              cmd.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' :
              cmd.status === 'failed'    ? 'text-red-400 bg-red-500/10' :
              cmd.status === 'executing' ? 'text-indigo-400 bg-indigo-500/10' :
              'text-zinc-500 bg-zinc-800'
            }`}>
              {cmd.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
