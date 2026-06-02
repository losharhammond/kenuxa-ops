import { Router, type IRouter } from 'express'
import { getProfile, updateProfile } from '../controllers/profile.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: IRouter = Router()

router.use(requireAuth as any)
router.get('/',  getProfile as any)
router.put('/',  updateProfile as any)

export default router
