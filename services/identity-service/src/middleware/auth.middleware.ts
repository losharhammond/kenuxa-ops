import type { Request, Response, NextFunction } from 'express'
import { verifySupabaseToken } from '../lib/jwt.js'

export interface AuthenticatedRequest extends Request {
  user?: {
    id:    string   // Supabase user UUID
    email: string
    role:  string
  }
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header required' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = await verifySupabaseToken(token)
    req.user = { id: payload.sub, email: payload.email, role: payload.role }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
