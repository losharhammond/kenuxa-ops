/**
 * GET  /api/queue         — Queue stats + peek at pending jobs
 * POST /api/queue         — Manually enqueue a job (admin/debug)
 * DELETE /api/queue/dead  — Purge dead-letter queue
 *
 * Phase 3: Queue management API
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import {
  getQueueStats,
  peekQueue,
  purgeDeadLetter,
  enqueue,
} from '@/services/queue/queue.service'
import type { JobType } from '@/types/ops'

export const dynamic = 'force-dynamic'

// ── GET — queue stats + peek ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const peek  = req.nextUrl.searchParams.get('peek') !== 'false'
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '10')

    const [stats, jobs] = await Promise.all([
      getQueueStats(),
      peek ? peekQueue(Math.min(limit, 50)) : Promise.resolve([]),
    ])

    return NextResponse.json({ stats, jobs })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ── POST — manually enqueue a job ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await req.json() as {
      type:    JobType
      payload: Record<string, unknown>
      delay?:  number
    }

    if (!body.type || !body.payload) {
      return NextResponse.json({ error: 'type and payload are required' }, { status: 400 })
    }

    const job = await enqueue(
      body.type,
      body.payload,
      auth.supabaseUserId ?? auth.ctx.userId,
      {
        orgId:       auth.ctx.orgId,
        scheduledAt: body.delay
          ? new Date(Date.now() + body.delay * 1000).toISOString()
          : undefined,
      }
    )

    return NextResponse.json({ queued: true, job }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ── DELETE — purge dead-letter queue ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const purged = await purgeDeadLetter()
    return NextResponse.json({ purged, message: `Purged ${purged} dead-letter jobs` })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
