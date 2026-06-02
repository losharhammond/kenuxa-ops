import { Router, type IRouter } from 'express'
import { register, login, refresh, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: IRouter = Router()

router.post('/register', register)
router.post('/login',    login)
router.post('/refresh',  refresh)
router.get('/me',        requireAuth, me as any)

export default router
