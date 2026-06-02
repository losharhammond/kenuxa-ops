import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

interface AppError extends Error {
  statusCode?: number
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    })
    return
  }

  const status = err.statusCode ?? 500
  const message = status < 500 ? err.message : 'Internal server error'

  if (status >= 500) {
    console.error('[identity-service] error:', err)
  }

  res.status(status).json({ error: message })
}
