import 'dotenv/config'
import app from './app.js'
import { prisma } from './lib/prisma.js'

const PORT = parseInt(process.env['PORT'] ?? '4001', 10)

async function start() {
  await prisma.$connect()
  console.log('[identity-service] Database connected')

  app.listen(PORT, () => {
    console.log(`[identity-service] Running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[identity-service] Fatal startup error:', err)
  process.exit(1)
})
