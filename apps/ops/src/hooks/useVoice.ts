/**
 * KENUXA OPS — useVoice Hook (Phase 5.2 — Fixed)
 *
 * Persistent operational voice runtime:
 *  - Wake word: "Hey Kenuxa" (continuous low-power background mode)
 *  - Silence threshold: FINAL_SILENCE_MS via interim-result timer
 *  - Session persistence: entities, browser context, 30s idle timeout
 *  - Follow-up mode: stays active after execution
 *  - Domain-aware routing: desktop/file → bridge check, email → Outlook first
 *  - 10 operational status states
 *
 * Key design principles:
 *  - ALL cross-callback function calls go through useRef so event handlers
 *    always invoke the latest function version (eliminates stale closures).
 *  - Active listening uses NON-continuous mode: browser fires onFinal once
 *    when the user stops speaking — no premature partial-result firing.
 *  - Phase 2 routing (isComplexGoal → startExecution, else → routeCommand)
 *    is the primary path; domain classification adds UI state + bridge check.
 */
'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { BrowserSTT }       from '@/services/voice/stt.service'
import { getTTS, speak }    from '@/services/voice/tts.service'
import { routeCommand }     from '@/services/commands/router.service'
import { normalizeWakeWord, stripWakeWord } from '@/lib/utils'
import { useOpsStore }      from '@/store/ops.store'
import { useExecution }     from '@/hooks/useExecution'
import {
  classifyDomainFast,
  classifyDomain,
  extractEntities,
  DOMAIN_META,
} from '@/services/execution/domain.classifier'
import type { VoiceState, ExecutionDomain, ActiveVoiceSession } from '@/types/ops'
import { nanoid } from 'nanoid'

// Register command handlers
import '@/services/commands/handlers/system.handler'
import '@/services/commands/handlers/email.handler'
import '@/services/commands/handlers/kenuxa.handler'
import '@/services/commands/handlers/memory.handler'

// ── Timing constants ───────────────────────────────────────────────────────────

const FINAL_SILENCE_MS  = 2_500   // silence after interim result → end of command
const SESSION_IDLE_MS   = 30_000  // no activity → back to sleep
const WAKE_DEBOUNCE_MS  =   500   // prevent double wake-word trigger
const RESTART_DELAY_MS  =   800   // delay before restarting wake-word loop

// ── Complex goal heuristic (routes to full pipeline instead of fast handler) ──

function isComplexGoal(text: string): boolean {
  const lower = text.toLowerCase()
  if (/(and then|then email|then send|then save|and email|and send|and save|and report)/i.test(lower)) return true
  if (/(search for.+and|find.+and|look up.+and|research.+and)/i.test(lower)) return true
  if (/(open.*website|go to.*website|browse to|visit.*site|extract from|scrape|get data from)/i.test(lower)) return true
  return ['report', 'analysis', 'summary of', 'compile', 'gather', 'collect', 'monitor']
    .some(w => lower.includes(w))
}

// ── Public interface ───────────────────────────────────────────────────────────

export interface UseVoiceReturn {
  voiceState:         VoiceState
  transcript:         string
  interimText:        string
  isListening:        boolean
  isSupported:        boolean
  sessionActive:      boolean
  currentDomain:      ExecutionDomain | null
  startListening:     () => void
  stopListening:      () => void
  cancelListening:    () => void
  endSession:         () => void
  pushToTalk:         () => void
  processText:        (text: string) => Promise<void>
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useVoice(): UseVoiceReturn {
  const {
    voiceState, setVoiceState, transcript, setTranscript,
    interimTranscript, setInterim, addCommand,
    setOperationalStatus, startVoiceSession, endVoiceSession,
    updateSessionEntity, setBridgeConnected,
  } = useOpsStore()

  const { start: startExecution } = useExecution()

  // ── Hardware/timer refs ────────────────────────────────────────────────────
  const sttRef          = useRef<BrowserSTT | null>(null)
  const ttsRef          = useRef(getTTS())
  const wakeDebounce    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const silenceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isActive        = useRef(false)   // STT currently capturing a command
  const inSession       = useRef(false)   // voice session open
  const accTranscript   = useRef('')      // latest interim text (silence-timer fallback)

  const [isSupported,   setIsSupported]   = useState(false)
  const [currentDomain, setCurrentDomain] = useState<ExecutionDomain | null>(null)

  // ── Stable function refs ───────────────────────────────────────────────────
  //
  // Every function that is called inside an STT event handler, setTimeout, or
  // another callback is stored in a ref and updated on EVERY render.
  // This guarantees event handlers always call the freshest function version
  // without needing to re-register callbacks — the canonical fix for stale
  // React closures in long-lived event listeners.
  //
  const processCommandRef  = useRef<(text: string) => Promise<void>>(async () => {})
  const goToFollowUpRef    = useRef<() => void>(() => {})
  const restartWakeRef     = useRef<() => void>(() => {})
  const startActiveRef     = useRef<(silent?: boolean) => void>(() => {})
  const startWakeRef       = useRef<() => void>(() => {})

  // ── Initialisation ─────────────────────────────────────────────────────────

  useEffect(() => {
    const stt = new BrowserSTT()
    sttRef.current = stt
    setIsSupported(stt.isSupported())
    probeBridgeConnection()
    return () => {
      stt.abort()
      clearAllTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function clearAllTimers() {
    if (silenceTimer.current)  clearTimeout(silenceTimer.current)
    if (sessionTimer.current)  clearTimeout(sessionTimer.current)
    if (wakeDebounce.current)  clearTimeout(wakeDebounce.current)
    silenceTimer.current  = null
    sessionTimer.current  = null
    wakeDebounce.current  = null
  }

  async function probeBridgeConnection() {
    try {
      const res  = await fetch('/api/bridge')
      const data = await res.json() as { connected?: boolean }
      setBridgeConnected(data.connected ?? false)
    } catch {
      setBridgeConnected(false)
    }
  }

  async function checkBridgeAvailable(): Promise<boolean> {
    try {
      const res  = await fetch('/api/bridge')
      const data = await res.json() as { connected?: boolean }
      setBridgeConnected(data.connected ?? false)
      return data.connected ?? false
    } catch {
      setBridgeConnected(false)
      return false
    }
  }

  function createVoiceSession(): ActiveVoiceSession {
    return {
      id:             nanoid(10),
      startedAt:      new Date().toISOString(),
      lastCommandAt:  new Date().toISOString(),
      commandCount:   0,
      entities:       {},
      browserContext: {},
      activeWorkflow: null,
      pendingAction:  null,
    }
  }

  function resetSessionIdleTimer() {
    if (sessionTimer.current) clearTimeout(sessionTimer.current)
    sessionTimer.current = setTimeout(() => {
      if (inSession.current) {
        inSession.current = false
        endVoiceSession()
        setOperationalStatus('sleeping')
        speak('Session ended. Say Hey Kenuxa to start again.', 'normal')
        restartWakeRef.current()   // always fresh via ref
      }
    }, SESSION_IDLE_MS)
  }

  // ── Core command processor ─────────────────────────────────────────────────
  //
  // Defined as a plain async function (not useCallback) so it always captures
  // the latest closure values. Called exclusively through processCommandRef
  // from event handlers so no stale-closure risk at call sites.

  async function processCommand(rawText: string): Promise<void> {
    const text = rawText.trim()

    if (!text) {
      if (inSession.current) {
        goToFollowUpRef.current()
      } else {
        restartWakeRef.current()
      }
      return
    }

    setVoiceState('processing')
    setTranscript(text)
    setOperationalStatus('processing')

    if (!inSession.current) {
      inSession.current = true
      startVoiceSession(createVoiceSession())
    }
    resetSessionIdleTimer()

    try {
      // ── Fast domain classification (UI + bridge check only) ──────────────
      const fastDomain = classifyDomainFast(text)

      if (fastDomain) {
        setCurrentDomain(fastDomain)
        const meta = DOMAIN_META[fastDomain]
        setOperationalStatus(meta.status as Parameters<typeof setOperationalStatus>[0])

        // Extract & store entities for session context
        const entities = extractEntities(text)
        Object.entries(entities).forEach(([k, v]) => updateSessionEntity(k, v))

        // Desktop/file commands: verify bridge before executing
        if (meta.requiresBridge) {
          const bridgeOk = await checkBridgeAvailable()
          if (!bridgeOk) {
            speak('Desktop bridge agent not connected. Please start the KENUXA desktop bridge.', 'high')
            setOperationalStatus('completed')
            goToFollowUpRef.current()
            return
          }
        }
      }

      // ── Primary routing (Phase 2 proven path) ───────────────────────────
      //
      // isComplexGoal  → full 7-step pipeline (Planner + DAG execution)
      // browser/workflow → full pipeline (Playwright worker)
      // email/desktop/file → full pipeline (specialized agents)
      // conversation/memory → fast command router (no Groq planning overhead)

      if (
        isComplexGoal(text) ||
        fastDomain === 'browser' ||
        fastDomain === 'workflow'
      ) {
        speak('On it.', 'system')
        void startExecution(text, 'voice')

      } else if (
        fastDomain === 'email' ||
        fastDomain === 'desktop' ||
        fastDomain === 'file'
      ) {
        speak('Executing.', 'system')
        void startExecution(text, 'voice')

      } else {
        // fastDomain === 'conversation' or null
        // Attempt slow classifier only when fast path returned null
        if (!fastDomain) {
          const domain = await classifyDomain(text)
          setCurrentDomain(domain)
          const meta = DOMAIN_META[domain]
          setOperationalStatus(meta.status as Parameters<typeof setOperationalStatus>[0])

          if (domain !== 'conversation') {
            // Slow classifier identified an actionable domain
            void startExecution(text, 'voice')
            // Fall through to pollDone below — execution is async
            return
          }
        }

        // Fast conversation/memory/system handler
        const command = await routeCommand(text)
        addCommand(command)
      }
    } catch (err) {
      console.error('[useVoice] Command error:', err)
      speak('Something went wrong. Try again.', 'high')
    }

    // ── Poll TTS completion → transition to follow-up or sleep ──────────────
    const pollDone = () => {
      if (ttsRef.current.isSpeaking()) {
        setVoiceState('speaking')
        setTimeout(pollDone, 150)
      } else {
        setOperationalStatus('completed')
        setTimeout(() => {
          if (inSession.current) {
            goToFollowUpRef.current()
          } else {
            restartWakeRef.current()
          }
        }, 800)
      }
    }
    setTimeout(pollDone, 200)
  }

  // Update ref every render so callbacks always call the latest version
  processCommandRef.current = processCommand

  // ── Follow-up mode ─────────────────────────────────────────────────────────

  function goToFollowUpMode() {
    setVoiceState('idle')
    setOperationalStatus('follow_up')
    setInterim('')
    setCurrentDomain(null)

    // Brief pause, then silently re-enter active listening
    setTimeout(() => {
      if (inSession.current) {
        startActiveRef.current(true)
      }
    }, 1200)
  }

  goToFollowUpRef.current = goToFollowUpMode

  // ── Active listening (NON-continuous) ──────────────────────────────────────
  //
  // Uses continuous=false so the Web Speech API fires onFinal ONCE when the
  // user stops speaking — no premature partial-result callbacks.
  //
  // We additionally layer a FINAL_SILENCE_MS silence timer on top of onInterim
  // so the user doesn't have to wait for the browser's own (often 3-7s) timeout.
  // When the timer fires it calls stt.stop() which triggers onFinal gracefully.
  //
  // IMPORTANT: isActive.current is NOT set to false inside the silence timer.
  //            Only onFinal (and onEnd fallback) set it false, so onFinal is
  //            never skipped after stop() is called.

  function startActiveListening(silent = false) {
    const stt = sttRef.current
    if (!stt || isActive.current) return

    isActive.current      = true
    accTranscript.current = ''

    setVoiceState('listening')
    setOperationalStatus('listening')

    if (!silent) {
      speak('Listening.', 'system')
    }

    stt.abort()  // clean slate

    stt.start(
      {
        onInterim: (text) => {
          setInterim(text)
          accTranscript.current = text  // track latest interim for fallback

          // Reset silence timer on each new interim result
          if (silenceTimer.current) clearTimeout(silenceTimer.current)
          silenceTimer.current = setTimeout(() => {
            // Silence detected — gently stop recognition so onFinal fires
            if (isActive.current) {
              stt.stop()   // do NOT set isActive=false here; let onFinal do it
            }
          }, FINAL_SILENCE_MS)
        },

        onFinal: (result) => {
          if (!isActive.current) return
          if (silenceTimer.current) clearTimeout(silenceTimer.current)
          silenceTimer.current = null

          isActive.current = false
          setInterim('')

          // Use result.text; fall back to last interim if the browser returns empty
          const finalText = result.text.trim() || accTranscript.current.trim()
          void processCommandRef.current(finalText)
        },

        onError: (err) => {
          console.error('[useVoice] STT error during active listening:', err)
          isActive.current = false
          clearAllTimers()
          if (inSession.current) {
            goToFollowUpRef.current()
          } else {
            restartWakeRef.current()
          }
        },

        onEnd: () => {
          // Fires after onFinal in normal flow — isActive is already false.
          // Only act if somehow we ended without onFinal being called.
          if (isActive.current) {
            isActive.current = false
            setInterim('')
            const fallback = accTranscript.current.trim()
            if (fallback) {
              void processCommandRef.current(fallback)
            } else if (inSession.current) {
              goToFollowUpRef.current()
            } else {
              restartWakeRef.current()
            }
          }
        },
      },
      false,   // ← NON-continuous: browser fires onFinal once, then stops
    )
  }

  startActiveRef.current = startActiveListening

  // ── Wake-word detection (continuous background mode) ───────────────────────

  function startWakeWordMode() {
    const stt = sttRef.current
    if (!stt || !stt.isSupported() || isActive.current) return

    setVoiceState('idle')
    setOperationalStatus('sleeping')
    inSession.current = false

    stt.start(
      {
        onInterim: (text) => {
          if (normalizeWakeWord(text) && !wakeDebounce.current) {
            wakeDebounce.current = setTimeout(
              () => { wakeDebounce.current = null },
              WAKE_DEBOUNCE_MS,
            )
            stt.abort()
            setTimeout(() => startActiveRef.current(false), 50)
          }
        },

        onFinal: (result) => {
          const normalized = normalizeWakeWord(result.text)
          if (normalized && !isActive.current) {
            const cmd = stripWakeWord(result.text)
            if (cmd.trim()) {
              // Wake word + inline command ("Hey Kenuxa send an email…")
              void processCommandRef.current(cmd)
            } else {
              startActiveRef.current(false)
            }
          } else {
            setTimeout(() => startWakeRef.current(), RESTART_DELAY_MS)
          }
        },

        onError: () => {
          setTimeout(() => startWakeRef.current(), 2_000)
        },

        onEnd: () => {
          if (!isActive.current) {
            setTimeout(() => startWakeRef.current(), RESTART_DELAY_MS)
          }
        },
      },
      true,   // ← continuous: never stops, always listening for wake word
    )
  }

  startWakeRef.current = startWakeWordMode

  // ── Restart helpers ────────────────────────────────────────────────────────

  function restartWakeWordMode() {
    setInterim('')
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current)
      silenceTimer.current = null
    }
    setTimeout(() => startWakeRef.current(), RESTART_DELAY_MS)
  }

  restartWakeRef.current = restartWakeWordMode

  // ── Manual controls ────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    startWakeRef.current()
  }, [])

  const stopListening = useCallback(() => {
    sttRef.current?.abort()
    isActive.current = false
    clearAllTimers()
    setVoiceState('idle')
    setOperationalStatus(inSession.current ? 'follow_up' : 'sleeping')
  }, [setVoiceState, setOperationalStatus])

  const cancelListening = useCallback(() => {
    sttRef.current?.abort()
    isActive.current = false
    clearAllTimers()
    ttsRef.current.cancel()
    setVoiceState('idle')
    setInterim('')
    setOperationalStatus('sleeping')
    inSession.current = false
    endVoiceSession()
    restartWakeRef.current()
  }, [setVoiceState, setInterim, setOperationalStatus, endVoiceSession])

  const endSession = useCallback(() => {
    inSession.current = false
    clearAllTimers()
    endVoiceSession()
    setOperationalStatus('sleeping')
    speak('Session ended.', 'normal')
    restartWakeRef.current()
  }, [endVoiceSession, setOperationalStatus])

  const pushToTalk = useCallback(() => {
    if (!isActive.current) {
      startActiveRef.current(true)
    }
  }, [])

  // processText: used by the voice page text-input box
  const processText = useCallback(async (text: string) => {
    if (!inSession.current) {
      inSession.current = true
      startVoiceSession(createVoiceSession())
    }
    await processCommandRef.current(text)
  }, [startVoiceSession])

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    voiceState,
    transcript,
    interimText:    interimTranscript,
    isListening:    sttRef.current?.listening ?? false,
    isSupported,
    sessionActive:  inSession.current,
    currentDomain,
    startListening,
    stopListening,
    cancelListening,
    endSession,
    pushToTalk,
    processText,
  }
}
