import { Router, type IRouter } from 'express'
import { getState, updateState } from '../controllers/identity.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: IRouter = Router()

router.use(requireAuth as any)
router.get('/state',  getState as any)
router.put('/state',  updateState as any)

export default router
