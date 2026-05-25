'use client'

import Link             from 'next/link'
import { usePathname }  from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Mic, LayoutDashboard, Zap, Database,
  Mail, Puzzle, ChevronLeft, ChevronRight,
  Settings, Cpu, Activity, MonitorSpeaker,
} from 'lucide-react'
import { useOpsStore } from '@/store/ops.store'
import { cn }          from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'     },
  { href: '/voice',     icon: Mic,             label: 'Voice Console' },
  { href: '/execute',   icon: Cpu,             label: 'Execute'       },
  { href: '/workflows', icon: Zap,             label: 'Workflows'     },
  { href: '/memory',    icon: Database,        label: 'Memory'        },
  { href: '/email',     icon: Mail,            label: 'Email Hub'     },
  { href: '/plugins',   icon: Puzzle,          label: 'Plugins'       },
  { href: '/agent',     icon: MonitorSpeaker,  label: 'Desktop Agent' },
  { href: '/system',    icon: Activity,        label: 'System'        },
] as const

interface Props { voiceState?: string }

export function Sidebar({ voiceState }: Props) {
  const pathname    = usePathname()
  const { sidebarOpen, setSidebar } = useOpsStore()

  const isVoiceActive = voiceState === 'listening' || voiceState === 'processing' || voiceState === 'speaking'

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 220 : 64 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full z-30 flex flex-col border-r border-zinc-800/80
                 bg-[#050508] overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-zinc-800/60 shrink-0">
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500',
          isVoiceActive
            ? 'bg-emerald-600/30 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
            : 'bg-indigo-600/20 border border-indigo-500/30'
        )}>
          <Brain className={cn('w-4 h-4', isVoiceActive ? 'text-emerald-400' : 'text-indigo-400')} />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="overflow-hidden"
            >
              <p className="text-xs font-black text-white tracking-widest whitespace-nowrap">KENUXA OPS</p>
              <p className="text-[9px] text-zinc-600 whitespace-nowrap tracking-wider">VOICE OPERATIONS</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all group',
                active
                  ? 'bg-indigo-600/15 border border-indigo-500/20 text-indigo-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400')} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Voice status indicator (collapsed) */}
      {!sidebarOpen && isVoiceActive && (
        <div className="px-2 pb-2">
          <div className="w-8 h-1.5 rounded-full bg-emerald-500/40 mx-auto">
            <motion.div
              className="h-full bg-emerald-400 rounded-full"
              animate={{ width: ['20%', '100%', '20%'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>
      )}

      {/* Toggle + Settings */}
      <div className="border-t border-zinc-800/60 p-2 space-y-1 shrink-0">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-all"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm whitespace-nowrap">Settings</motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={() => setSidebar(!sidebarOpen)}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-all"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs whitespace-nowrap">Collapse</motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
