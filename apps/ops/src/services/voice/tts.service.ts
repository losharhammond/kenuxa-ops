/**
 * KENUXA OPS — Text-to-Speech Service
 * Phase 1: Browser Web Speech Synthesis (free, instant)
 * Fallback: Edge TTS via server API for higher quality
 */

export type TTSPriority = 'system' | 'high' | 'normal' | 'low'

interface TTSJob {
  text:     string
  priority: TTSPriority
  onStart?: () => void
  onEnd?:   () => void
}

const PRIORITY_ORDER: Record<TTSPriority, number> = {
  system: 0, high: 1, normal: 2, low: 3
}

export class BrowserTTS {
  private synth:    SpeechSynthesis | null    = null
  private queue:    TTSJob[]                  = []
  private speaking: boolean                   = false
  private voice:    SpeechSynthesisVoice | null = null
  private pitch:    number                    = 1.0
  private rate:     number                    = 1.1
  private volume:   number                    = 1.0

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  init(): void {
    if (!this.isSupported()) return
    this.synth = window.speechSynthesis

    // Load voices (may be async in some browsers)
    const loadVoice = () => {
      const voices = this.synth?.getVoices() ?? []
      // Prefer a natural English voice
      this.voice =
        voices.find(v => v.name.includes('Google UK English Male')) ??
        voices.find(v => v.name.includes('Google US English'))     ??
        voices.find(v => v.lang === 'en-US' && !v.localService)    ??
        voices.find(v => v.lang === 'en-US')                       ??
        voices[0] ??
        null
    }

    loadVoice()
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoice
    }
  }

  speak(text: string, priority: TTSPriority = 'normal', onEnd?: () => void): void {
    if (!this.isSupported() || !text.trim()) return

    const job: TTSJob = { text: text.trim(), priority, onEnd }

    // System priority: interrupt everything
    if (priority === 'system') {
      this.cancel()
      this.queue.unshift(job)
    } else {
      // Insert by priority
      const idx = this.queue.findIndex(j => PRIORITY_ORDER[j.priority] > PRIORITY_ORDER[priority])
      if (idx === -1) this.queue.push(job)
      else            this.queue.splice(idx, 0, job)
    }

    if (!this.speaking) this.processQueue()
  }

  private processQueue(): void {
    if (this.queue.length === 0 || !this.synth) {
      this.speaking = false
      return
    }

    this.speaking = true
    const job = this.queue.shift()!
    const utterance = new SpeechSynthesisUtterance(job.text)

    if (this.voice)  utterance.voice  = this.voice
    utterance.pitch  = this.pitch
    utterance.rate   = this.rate
    utterance.volume = this.volume
    utterance.lang   = 'en-US'

    utterance.onstart = () => job.onStart?.()
    utterance.onend   = () => {
      job.onEnd?.()
      this.processQueue()
    }
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') console.error('[TTS] error:', e.error)
      this.processQueue()
    }

    this.synth.speak(utterance)
  }

  cancel(): void {
    this.queue = []
    this.synth?.cancel()
    this.speaking = false
  }

  pause():  void { this.synth?.pause()  }
  resume(): void { this.synth?.resume() }

  setVoiceParams(opts: { pitch?: number; rate?: number; volume?: number }): void {
    if (opts.pitch  !== undefined) this.pitch  = opts.pitch
    if (opts.rate   !== undefined) this.rate   = opts.rate
    if (opts.volume !== undefined) this.volume = opts.volume
  }

  isSpeaking(): boolean { return this.speaking }
}

// Singleton for client-side use
let ttsSingleton: BrowserTTS | null = null

export function getTTS(): BrowserTTS {
  if (!ttsSingleton) {
    ttsSingleton = new BrowserTTS()
    ttsSingleton.init()
  }
  return ttsSingleton
}

// Convenience — speak immediately at normal priority
export function speak(text: string, priority: TTSPriority = 'normal'): void {
  getTTS().speak(text, priority)
}
