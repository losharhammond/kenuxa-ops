import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'
import { prisma } from '../lib/prisma.js'

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

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = registerSchema.parse(req.body)
    const result = await service.register(data)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body)
    const result = await service.login(data)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const result = await service.refreshToken(refreshToken)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id
    const meta = await prisma.academyUserMeta.findUnique({ where: { supabaseUserId: userId } })
    res.json({
      id:        userId,
      email:     req.user!.email,
      role:      meta?.role ?? 'learner',
      createdAt: meta?.createdAt.toISOString(),
      updatedAt: meta?.updatedAt.toISOString(),
    })
  } catch (err) {
    next(err)
  }
}
