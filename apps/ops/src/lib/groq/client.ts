/**
 * KENUXA OPS — Groq AI Client
 * Uses GROQ_OPS_API_KEY for independent rate limits from other KENUXA apps
 */
import Groq from 'groq-sdk'

let groqClient: Groq | null = null

export function getGroq(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_OPS_API_KEY,
    })
  }
  return groqClient
}

export const OPS_MODELS = {
  fast:      'llama-3.1-8b-instant',    // fastest, for intent classification
  balanced:  'llama-3.3-70b-versatile', // best balance
  powerful:  'llama-3.3-70b-versatile', // most capable
  whisper:   'whisper-large-v3-turbo',  // STT
} as const

// ── Chat helpers ───────────────────────────────────────────────────────────────

export async function fastChat(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const groq = getGroq()
  const res = await groq.chat.completions.create({
    model:      OPS_MODELS.fast,
    temperature: options?.temperature ?? 0.1,
    max_tokens:  options?.maxTokens   ?? 512,
    messages: [
      { role: 'system',  content: systemPrompt },
      { role: 'user',    content: userMessage  },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

export async function balancedChat(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const groq = getGroq()
  const res = await groq.chat.completions.create({
    model:       OPS_MODELS.balanced,
    temperature: options?.temperature ?? 0.2,
    max_tokens:  options?.maxTokens   ?? 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

export async function fastJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number }
): Promise<T> {
  const groq = getGroq()
  const res = await groq.chat.completions.create({
    model:            OPS_MODELS.fast,
    temperature:      options?.temperature ?? 0.05,
    max_tokens:       1024,
    response_format:  { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt + '\n\nRespond ONLY with valid JSON.' },
      { role: 'user',   content: userMessage },
    ],
  })
  const text = res.choices[0]?.message?.content ?? '{}'
  return JSON.parse(text) as T
}

export async function transcribeAudio(audioBlob: Blob, filename = 'audio.wav'): Promise<string> {
  const groq = getGroq()
  const file = new File([audioBlob], filename, { type: audioBlob.type || 'audio/wav' })

  const res = await groq.audio.transcriptions.create({
    file,
    model:    OPS_MODELS.whisper,
    language: 'en',
  })
  return res.text
}
