// ─── Input validation helpers ───────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export function isStrongPassword(pw: string): boolean {
  return pw.length >= 8
}

/** Clamp a number to [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Clamp a score to the 0–100 range used by IdentityState */
export function clampScore(value: number): number {
  return clamp(value, 0, 100)
}
