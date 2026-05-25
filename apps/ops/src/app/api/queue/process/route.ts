/**
 * POST /api/queue/process — Vercel Cron endpoint (every 30s)
 *
 * Protected by QUEUE_PROCESSOR_SECRET header.
 * Drains up to MAX_JOBS_PER_RUN jobs from Redis queue.
 * Also callable manually with a valid CORE auth token (for debugging).
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import { processQueue }              from '@/services/queue/processor.service'
import { getQueueStats }             from '@/services/queue/queue.service'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60  // Vercel Pro: up to 300s; Hobby: 60s

// ── POST — process queue ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Accept either the cron secret (from Vercel Cron) or CORE auth (manual trigger)
  const cronSecret = process.env.QUEUE_PROCESSOR_SECRET
  const headerSecret = req.headers.get('x-queue-secret') ??
                       req.headers.get('authorization')?.replace('Bearer ', '')

  const isCronCall = cronSecret && headerSecret === cronSecret
  const isCoreCall = !isCronCall ? await resolveAuth(req) : null

  if (!isCronCall && !isCoreCall) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()

  try {
    const result = await processQueue()
    const stats  = await getQueueStats().catch(() => null)

    return NextResponse.json({
      ...result,
      durationMs: Date.now() - start,
      stats,
      triggeredBy: isCronCall ? 'cron' : 'manual',
    })
  } catch (err) {
    console.error('[queue/process]', err)
    return NextResponse.json(
      { error: (err as Error).message, durationMs: Date.now() - start },
      { status: 500 }
    )
  }
}

// ── GET — queue processor status (last run info) ──────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const stats = await getQueueStats()
    return NextResponse.json({
      status:  'ready',
      stats,
      message: 'Queue processor is ready. POST to trigger a manual run.',
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
