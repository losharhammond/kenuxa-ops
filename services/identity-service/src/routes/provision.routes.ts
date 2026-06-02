import { Router, type IRouter } from 'express'
import { provision }            from '../controllers/auth.controller.js'
import { requireAuth }          from '../middleware/auth.middleware.js'

const router: IRouter = Router()

router.post('/', requireAuth, provision as any)

export default router
