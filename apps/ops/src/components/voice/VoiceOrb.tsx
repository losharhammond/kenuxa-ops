'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Volume2, Brain } from 'lucide-react'
import type { VoiceState } from '@/types/ops'

interface Props {
  voiceState: VoiceState
  onClick:    () => void
  size?:      'sm' | 'md' | 'lg'
}

const STATE_CONFIG = {
  idle: {
    icon:        Mic,
    iconColor:   'text-zinc-500',
    orbColor:    'bg-zinc-800',
    glowColor:   '',
    label:       'Say "Hey Kenuxa"',
    animate:     false,
  },
  listening: {
    icon:        Mic,
    iconColor:   'text-emerald-400',
    orbColor:    'bg-emerald-950',
    glowColor:   'shadow-[0_0_40px_8px_rgba(16,185,129,0.4)]',
    label:       'Listening…',
    animate:     true,
  },
  processing: {
    icon:        Brain,
    iconColor:   'text-indigo-400',
    orbColor:    'bg-indigo-950',
    glowColor:   'shadow-[0_0_40px_8px_rgba(99,102,241,0.4)]',
    label:       'Thinking…',
    animate:     true,
  },
  speaking: {
    icon:        Volume2,
    iconColor:   'text-amber-400',
    orbColor:    'bg-amber-950',
    glowColor:   'shadow-[0_0_40px_8px_rgba(245,158,11,0.4)]',
    label:       'Speaking…',
    animate:     true,
  },
  error: {
    icon:        MicOff,
    iconColor:   'text-red-400',
    orbColor:    'bg-red-950',
    glowColor:   'shadow-[0_0_40px_8px_rgba(239,68,68,0.3)]',
    label:       'Error',
    animate:     false,
  },
}

const SIZES = {
  sm: { orb: 'w-14 h-14', icon: 'w-5 h-5' },
  md: { orb: 'w-24 h-24', icon: 'w-8 h-8' },
  lg: { orb: 'w-36 h-36', icon: 'w-12 h-12' },
}

export function VoiceOrb({ voiceState, onClick, size = 'lg' }: Props) {
  const cfg    = STATE_CONFIG[voiceState]
  const Icon   = cfg.icon
  const sizeCSS = SIZES[size]

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative ${sizeCSS.orb} rounded-full flex items-center justify-center
          border border-zinc-700 ${cfg.orbColor} ${cfg.glowColor}
          transition-all duration-500 cursor-pointer`}
      >
        {/* Pulse ring for active states */}
        <AnimatePresence>
          {cfg.animate && (
            <motion.span
              key="ring"
              className={`absolute inset-0 rounded-full border ${
                voiceState === 'listening'  ? 'border-emerald-500/40' :
                voiceState === 'processing' ? 'border-indigo-500/40'  :
                'border-amber-500/40'
              }`}
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Second slower ring */}
        <AnimatePresence>
          {cfg.animate && (
            <motion.span
              key="ring2"
              className={`absolute inset-0 rounded-full border ${
                voiceState === 'listening'  ? 'border-emerald-500/20' :
                voiceState === 'processing' ? 'border-indigo-500/20'  :
                'border-amber-500/20'
              }`}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div
          animate={cfg.animate ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: cfg.animate ? Infinity : 0 }}
        >
          {voiceState === 'processing' ? (
            <Loader2 className={`${sizeCSS.icon} ${cfg.iconColor} animate-spin`} />
          ) : (
            <Icon className={`${sizeCSS.icon} ${cfg.iconColor}`} />
          )}
        </motion.div>
      </motion.button>

      <AnimatePresence mode="wait">
        <motion.p
          key={voiceState}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`text-sm font-medium ${
            voiceState === 'idle'       ? 'text-zinc-600' :
            voiceState === 'listening'  ? 'text-emerald-400' :
            voiceState === 'processing' ? 'text-indigo-400' :
            voiceState === 'speaking'   ? 'text-amber-400' :
            'text-red-400'
          }`}
        >
          {cfg.label}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
