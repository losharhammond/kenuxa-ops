import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'

import authRoutes     from './routes/auth.routes.js'
import profileRoutes  from './routes/profile.routes.js'
import identityRoutes from './routes/identity.routes.js'
import walletRoutes     from './routes/wallet.routes.js'
import provisionRoutes  from './routes/provision.routes.js'
import { errorMiddleware } from './middleware/error.middleware.js'

const app: Express = express()

// ─── Security ───────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      process.env['CORS_ORIGIN'] ?? 'http://localhost:3003',
  credentials: true,
}))

// ─── Body parsing ───────────────────────────────────────────
app.use(express.json())

// ─── Health ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'identity-service', app: 'academy' })
})

// ─── Routes ─────────────────────────────────────────────────
app.use('/auth',     authRoutes)
app.use('/profile',  profileRoutes)
app.use('/identity', identityRoutes)
app.use('/wallet',   walletRoutes)    // proxies to KENUXA CORE
app.use('/auth/provision', provisionRoutes)  // idempotent Academy row setup

// ─── Error handling ─────────────────────────────────────────
app.use(errorMiddleware)

export default app
