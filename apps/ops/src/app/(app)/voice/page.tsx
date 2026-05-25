'use client'

/**
 * KENUXA OPS — Voice Console (Phase 5.2)
 *
 * Persistent operational runtime UI:
 *  - 10-state operational status display
 *  - Session context (entities, browser context, command count)
 *  - Continuous listening with silence threshold indicators
 *  - Follow-up mode with session timer
 *  - Bridge connection status
 *  - Text input fallback
 */

import { useState, useCallback, useEffect, useRef }  from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import {
  Mic, MicOff, RotateCcw, Keyboard,
  Settings2, ChevronDown, ChevronUp,
  AlertCircle, Wifi, WifiOff, LogOut,
  Monitor, Globe, Mail,
} from 'lucide-react'
import { useVoice }              from '@/hooks/useVoice'
import { VoiceOrb }              from '@/components/voice/VoiceOrb'
import { WaveformVisualizer }    from '@/components/voice/WaveformVisualizer'
import { TranscriptFeed }        from '@/components/voice/TranscriptFeed'
import { OperationalStatus }     from '@/components/voice/OperationalStatus'
import { useOpsStore }           from '@/store/ops.store'

// ── Example commands ───────────────────────────────────────────────────────────

const EXAMPLE_COMMANDS = [
  { emoji: '🌐', domain: 'browser',  cmd: 'Visit tally.so and take a screenshot' },
  { emoji: '📧', domain: 'email',    cmd: 'Send email to hammond@procusghana.com' },
  { emoji: '🖥',  domain: 'desktop', cmd: 'Open File Explorer' },
  { emoji: '📁', domain: 'file',     cmd: 'Go to Documents and open the latest PDF' },
  { emoji: '📝', domain: 'email',    cmd: 'Summarize my inbox' },
  { emoji: '⚡', domain: 'workflow', cmd: 'Run the morning briefing workflow' },
  { emoji: '💾', domain: 'memory',   cmd: 'Remember: client meeting is Friday at 3pm' },
  { emoji: '🔍', domain: 'browser',  cmd: 'Search for AI news and send me a report' },
]

const DOMAIN_COLORS: Record<string, string> = {
  browser:  'text-sky-400  bg-sky-500/10  border-sky-500/20',
  email:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  desktop:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
  file:     'text-amber-400 bg-amber-500/10 border-amber-500/20',
  workflow: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  memory:   'text-violet-400 bg-violet-500/10 border-violet-500/20',
}

// ── Text input fallback ────────────────────────────────────────────────────────

function TextInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) { onSubmit(value.trim()); setValue('') }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder='Type a command  (e.g. "Visit tally.com" or "Send email to John")'
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5
          text-sm text-zinc-200 placeholder-zinc-600
          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white
          hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Run
      </button>
    </form>
  )
}

// ── Session timer ──────────────────────────────────────────────────────────────

function useSessionTimer(sessionActive: boolean, startedAt: string | undefined) {
  const [elapsed, setElapsed] = useState(0)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (sessionActive && startedAt) {
      interval.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
      }, 1000)
    } else {
      setElapsed(0)
      if (interval.current) clearInterval(interval.current)
    }
    return () => { if (interval.current) clearInterval(interval.current) }
  }, [sessionActive, startedAt])

  return elapsed
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function VoiceConsolePage() {
  const { commandHistory, operationalStatus, activeVoiceSession, bridgeConnected } = useOpsStore()

  const {
    voiceState, transcript, interimText,
    isListening, isSupported, sessionActive, currentDomain,
    startListening, stopListening, cancelListening,
    endSession, pushToTalk, processText,
  } = useVoice()

  const [showTextInput, setShowTextInput] = useState(false)
  const [showExamples,  setShowExamples]  = useState(false)

  const sessionElapsed = useSessionTimer(sessionActive, activeVoiceSession?.startedAt)

  const handleTextSubmit = useCallback(async (text: string) => {
    await processText(text)
  }, [processText])

  const isOperating = operationalStatus !== 'sleeping'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            KENUXA OPS
            {sessionActive && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium"
              >
                SESSION ACTIVE
              </motion.span>
            )}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Say <span className="text-emerald-400 font-medium">"Hey Kenuxa"</span> to activate
            {sessionActive && (
              <span className="text-zinc-600 ml-2">
                · {activeVoiceSession?.commandCount ?? 0} command{activeVoiceSession?.commandCount !== 1 ? 's' : ''} this session
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bridge status chip */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] border ${
            bridgeConnected
              ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
              : 'text-zinc-600 bg-zinc-800/50 border-zinc-800'
          }`}>
            <Monitor size={10} />
            Bridge {bridgeConnected ? 'on' : 'off'}
          </div>

          {sessionActive && (
            <button
              onClick={endSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700
                text-xs text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all"
            >
              <LogOut size={12} /> End session
            </button>
          )}

          <button
            onClick={() => setShowTextInput(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              showTextInput
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                : 'border-zinc-700 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Keyboard size={14} /> Text
          </button>

          <button
            onClick={() => setShowExamples(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              showExamples
                ? 'border-zinc-600 bg-zinc-800 text-zinc-300'
                : 'border-zinc-700 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings2 size={14} />
            {showExamples ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {isListening ? (
            <button
              onClick={stopListening}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700
                text-xs text-zinc-400 hover:text-white transition-all"
            >
              <MicOff size={12} /> Stop
            </button>
          ) : (
            <button
              onClick={startListening}
              disabled={!isSupported}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30
                text-xs text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Mic size={12} /> Listen
            </button>
          )}

          {isOperating && (
            <button
              onClick={cancelListening}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700
                text-xs text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Not supported warning ── */}
      <AnimatePresence>
        {!isSupported && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5"
          >
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Voice not supported</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Use Chrome, Edge, or Safari. Use text input below as fallback.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Operational Status (Phase 5.2) ── */}
      <OperationalStatus
        status={operationalStatus}
        domain={currentDomain ?? undefined}
        sessionInfo={activeVoiceSession ? {
          commandCount: activeVoiceSession.commandCount,
          lastUrl:      activeVoiceSession.entities['lastUrl'],
          lastEmail:    activeVoiceSession.entities['lastEmail'],
          sessionSec:   sessionElapsed,
        } : undefined}
      />

      {/* ── Main voice orb area ── */}
      <motion.div
        className={`rounded-2xl border p-8 flex flex-col items-center gap-5 transition-all duration-500 ${
          isOperating
            ? 'border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-zinc-950/20'
            : 'border-zinc-800 bg-zinc-900/30'
        }`}
      >
        <VoiceOrb
          voiceState={voiceState}
          onClick={isListening ? stopListening : pushToTalk}
          size="lg"
        />

        <WaveformVisualizer voiceState={voiceState} barCount={48} />

        <p className="text-xs text-zinc-600 text-center">
          {operationalStatus === 'sleeping'   ? 'Click orb for push-to-talk · Or say "Hey Kenuxa"' :
           operationalStatus === 'listening'  ? 'Speak your command… (silence = submit)' :
           operationalStatus === 'processing' ? 'Classifying intent and routing…' :
           operationalStatus === 'executing'  ? 'Executing — real actions in progress' :
           operationalStatus === 'browser_active' ? '🌐 Browser automation running' :
           operationalStatus === 'email_sending'  ? '📧 Sending via Outlook Graph API…' :
           operationalStatus === 'desktop_active' ? '🖥 Desktop bridge executing…' :
           operationalStatus === 'file_opening'   ? '📁 Opening file…' :
           operationalStatus === 'completed'  ? '✅ Done — session still active' :
           operationalStatus === 'follow_up'  ? '⏳ Listening for follow-up… (30s idle → sleep)' :
           'Idle'}
        </p>

        {/* Domain indicator during execution */}
        {currentDomain && (operationalStatus as string) !== 'sleeping' && (operationalStatus as string) !== 'follow_up' && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${
            DOMAIN_COLORS[currentDomain] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'
          }`}>
            {currentDomain === 'browser'  ? <Globe size={12} /> :
             currentDomain === 'email'    ? <Mail  size={12} /> :
             currentDomain === 'desktop'  ? <Monitor size={12} /> :
             null}
            {currentDomain} domain
          </div>
        )}
      </motion.div>

      {/* ── Text input fallback ── */}
      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
          >
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500 mb-3 flex items-center gap-1.5">
                <Keyboard size={12} /> Text mode · same pipeline as voice
              </p>
              <TextInput onSubmit={handleTextSubmit} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Example commands ── */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
          >
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                Example commands
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {EXAMPLE_COMMANDS.map(({ emoji, domain, cmd }) => (
                  <button
                    key={cmd}
                    onClick={() => void handleTextSubmit(cmd)}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-zinc-800
                      bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/60
                      text-left transition-all group"
                  >
                    <span className="text-base shrink-0 mt-0.5">{emoji}</span>
                    <div className="min-w-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider border mr-1 ${
                        DOMAIN_COLORS[domain] ?? ''
                      }`}>
                        {domain}
                      </span>
                      <p className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors mt-1 break-words">
                        {cmd}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bridge not connected notice ── */}
      {!bridgeConnected && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <Monitor size={14} className="text-zinc-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">Desktop bridge not connected.</span>
              {' '}Desktop & file commands unavailable.
            </p>
            <p className="text-[10px] text-zinc-700 mt-0.5">
              Start the KENUXA Electron bridge agent on your computer to enable local control.
            </p>
          </div>
        </div>
      )}

      {/* ── Session log ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Session Log</h3>
          <div className="flex items-center gap-3">
            {sessionActive && (
              <span className="text-[10px] text-emerald-500/70">
                session {String(Math.floor(sessionElapsed / 60)).padStart(2,'0')}:{String(sessionElapsed % 60).padStart(2,'0')}
              </span>
            )}
            <span className="text-xs text-zinc-600">{commandHistory.length} commands</span>
          </div>
        </div>

        {commandHistory.length === 0 && !interimText && !transcript ? (
          <div className="text-center py-10">
            <Mic size={40} className="text-zinc-800 mx-auto mb-3" />
            <p className="text-xs text-zinc-600">No commands yet.</p>
            <p className="text-xs text-zinc-700 mt-1">
              Say "Hey Kenuxa" or click the orb to begin.
            </p>
          </div>
        ) : (
          <TranscriptFeed
            transcript={transcript}
            interimText={interimText}
            commands={commandHistory}
          />
        )}
      </div>
    </div>
  )
}
