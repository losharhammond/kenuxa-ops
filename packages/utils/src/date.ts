// ─── Date utilities ─────────────────────────────────────────

export function toISOString(date: Date): string {
  return date.toISOString()
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000)
}

export function isExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt) <= new Date()
}
