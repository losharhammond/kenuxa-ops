import { Router, type IRouter } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { ensureAcademyUser } from '../services/auth.service.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

const router: IRouter = Router()

const schema = z.object({
  fullName: z.string().optional(),
})

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName } = schema.parse(req.body)
    await ensureAcademyUser(req.user!.id, req.user!.email, fullName)
    res.json({ provisioned: true })
  } catch (err) {
    next(err)
  }
})

export default router
