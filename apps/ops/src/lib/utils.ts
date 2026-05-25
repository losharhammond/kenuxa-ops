import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s    = Math.floor(diff / 1000)
  const m    = Math.floor(s / 60)
  const h    = Math.floor(m / 60)
  const d    = Math.floor(h / 24)
  if (s  < 60)  return 'just now'
  if (m  < 60)  return `${m}m ago`
  if (h  < 24)  return `${h}h ago`
  return `${d}d ago`
}

export function extractEmail(text: string): string | null {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  return match?.[0] ?? null
}

export function sanitizeCommand(text: string): string {
  return text.trim().toLowerCase().replace(/['"]/g, '')
}

/** Sleep for n milliseconds */
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Generate a short readable ID */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** Map wake word variations to canonical form */
export function normalizeWakeWord(text: string): boolean {
  const lower = text.toLowerCase().trim()
  const patterns = [
    /^(hey|okay|ok|yo|hi)\s+kenuxa/,
    /^kenuxa[,.]?\s*/,
  ]
  return patterns.some(p => p.test(lower))
}

/** Strip wake word from start of text */
export function stripWakeWord(text: string): string {
  return text
    .replace(/^(hey|okay|ok|yo|hi)\s+kenuxa[,.]?\s*/i, '')
    .replace(/^kenuxa[,.]?\s*/i, '')
    .trim()
}
