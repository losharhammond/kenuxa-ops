import { Router, type IRouter } from 'express'
import { getBalance, getTransactions } from '../controllers/wallet.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router: IRouter = Router()

router.use(requireAuth as any)
router.get('/balance',      getBalance as any)
router.get('/transactions', getTransactions as any)

export default router
