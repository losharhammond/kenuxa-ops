/**
 * POST /api/browser — Browser automation proxy (Phase 3)
 *
 * Phase 3 rule: OPS does NOT run Playwright locally.
 * All browser tasks are dispatched to the external Playwright worker service.
 * Falls back to Groq-powered AI simulation if worker is unavailable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import { dispatchToWorker, mapBrowserAction } from '@/services/worker/playwright.client'
import { enqueue }                   from '@/services/queue/queue.service'

export const dynamic    = 'force-dynamic'
export const maxDuration = 15  // fast proxy — worker does the heavy lifting

export async function POST(req: NextRequest) {
  // ── CORE auth (Phase 3) ────────────────────────────────────────────────────
  const auth = await resolveAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      action:   string
      input:    Record<string, unknown>
      context?: unknown[]
      async?:   boolean   // if true, queue the job and return immediately
    }

    const action = mapBrowserAction(body.action)

    // Async mode: queue the job and return job ID
    if (body.async) {
      const job = await enqueue('browser_task', {
        action: body.action,
        input:  body.input,
      }, auth.ctx.userId, { orgId: auth.ctx.orgId })

      return NextResponse.json({
        queued: true,
        jobId:  job.id,
        message: 'Browser task queued — check /api/queue for status',
      })
    }

    // Sync mode: dispatch directly to worker and wait
    const result = await dispatchToWorker({
      action,
      input:  body.input,
      jobId:  `browser-${Date.now()}`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json(result.result)
  } catch (err) {
    console.error('[browser]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
