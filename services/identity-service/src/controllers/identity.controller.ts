import type { Response, NextFunction } from 'express'
import { z } from 'zod'
import { IdentityService } from '../services/identity.service.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

const service = new IdentityService()

const scoreField = z.number().int().min(0).max(100).optional()

const updateSchema = z.object({
  cognitiveScore:  scoreField,
  creativeScore:   scoreField,
  socialScore:     scoreField,
  emotionalScore:  scoreField,
  practicalScore:  scoreField,
  leadershipScore: scoreField,
  economicScore:   scoreField,
})

export async function getState(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const state = await service.getState(req.user!.id)
    res.json(state)
  } catch (err) {
    next(err)
  }
}

export async function updateState(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = updateSchema.parse(req.body)
    const state = await service.updateState(req.user!.id, data)
    res.json(state)
  } catch (err) {
    next(err)
  }
}
