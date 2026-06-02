import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import { ProfileService } from '../services/profile.service.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

const service = new ProfileService()

const updateSchema = z.object({
  fullName:  z.string().min(2).optional(),
  bio:       z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  location:  z.string().optional(),
  interests: z.array(z.string()).optional(),
  goals:     z.array(z.string()).optional(),
  metadata:  z.record(z.unknown()).optional(),
})

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await service.getProfile(req.user!.id)
    res.json(profile)
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSchema.parse(req.body)
    const profile = await service.updateProfile(req.user!.id, data)
    res.json(profile)
  } catch (err) {
    next(err)
  }
}
