/**
 * KENUXA OPS — Speech-to-Text Service
 * Phase 1: Browser Web Speech API (free, no server needed)
 * Fallback: Groq Whisper API for higher accuracy
 */

export type STTProvider = 'browser' | 'groq'

export interface STTResult {
  text:        string
  confidence:  number
  isFinal:     boolean
  provider:    STTProvider
  durationMs:  number
}

export interface STTCallbacks {
  onInterim: (text: string) => void
  onFinal:   (result: STTResult) => void
  onError:   (error: Error) => void
  onStart?:  () => void
  onEnd?:    () => void
}

// ── Browser Web Speech API ────────────────────────────────────────────────────

// ── Web Speech API type stubs (not in standard TS DOM lib) ────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
declare class SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult:    ((e: any) => void) | null
  onerror:     ((e: any) => void) | null
  onend:       (() => void) | null
  onstart:     (() => void) | null
}
type SpeechRecognitionEvent      = any  // interim/final results event
type SpeechRecognitionErrorEvent = any  // error event

declare global {
  interface Window {
    SpeechRecognition:       typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export class BrowserSTT {
  private recognition: SpeechRecognition | null = null
  private callbacks:   STTCallbacks | null       = null
  private startTime:   number                    = 0
  private continuous:  boolean                   = false
  private isListening: boolean                   = false

  get listening() { return this.isListening }

  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  }

  start(callbacks: STTCallbacks, continuous = false): void {
    if (!this.isSupported()) {
      callbacks.onError(new Error('Web Speech API not supported in this browser'))
      return
    }

    this.callbacks  = callbacks
    this.continuous = continuous
    this.startTime  = Date.now()

    const SpeechRecognitionClass = window.SpeechRecognition ?? window.webkitSpeechRecognition
    this.recognition = new SpeechRecognitionClass()

    this.recognition.continuous    = continuous
    this.recognition.interimResults = true
    this.recognition.lang          = 'en-US'
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      this.isListening = true
      callbacks.onStart?.()
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText   = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result) continue
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }

      if (interimText) callbacks.onInterim(interimText)
      if (finalText) {
        callbacks.onFinal({
          text:       finalText,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence ?? 0.9,
          isFinal:    true,
          provider:   'browser',
          durationMs: Date.now() - this.startTime,
        })
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return // expected
      callbacks.onError(new Error(`STT error: ${event.error}`))
    }

    this.recognition.onend = () => {
      this.isListening = false
      callbacks.onEnd?.()
    }

    try {
      this.recognition.start()
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
    this.isListening = false
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort()
    }
    this.isListening = false
  }
}

// ── Server-side Groq Whisper Transcription ────────────────────────────────────

export async function transcribeWithGroq(audioBlob: Blob): Promise<string> {
  const fd = new FormData()
  fd.append('audio', audioBlob, 'recording.wav')

  const res = await fetch('/api/voice/transcribe', {
    method: 'POST',
    body:   fd,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Transcription failed: ${err}`)
  }

  const json = await res.json() as { text: string }
  return json.text
}
