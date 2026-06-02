import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthService, ensureAcademyUser } from '../services/auth.service.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

const service = new AuthService()

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const provisionSchema = z.object({
  fullName: z.string().optional(),
})

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data   = registerSchema.parse(req.body)
    const result = await service.register(data)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data   = loginSchema.parse(req.body)
    const result = await service.login(data)
    res.json(result)
  } catch (err) { next(err) }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const result = await service.refreshToken(refreshToken)
    res.json(result)
  } catch (err) { next(err) }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getMe(req.user!.id, req.user!.email)
    res.json(result)
  } catch (err) { next(err) }
}

export async function provision(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName } = provisionSchema.parse(req.body)
    await ensureAcademyUser(req.user!.id, req.user!.email, fullName)
    res.json({ provisioned: true })
  } catch (err) { next(err) }
}
