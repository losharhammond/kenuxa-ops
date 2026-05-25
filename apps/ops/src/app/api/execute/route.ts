/**
 * POST /api/execute  — Start execution pipeline (Phase 3: CORE-authed, queue-backed)
 * GET  /api/execute  — Get execution history
 *
 * Phase 3 changes:
 *  - Every request validated by CORE auth middleware first
 *  - Short pipelines (< 30s) stream via SSE as before
 *  - Long/browser pipelines are queued in Redis and processed by cron
 *  - DAG engine replaces sequential executor for complex plans
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import { createClient }              from '@/lib/supabase/server'
import { ExecutionPipeline }         from '@/services/execution/pipeline.service'
import { enqueue }                   from '@/services/queue/queue.service'
import { isRedisConfigured }         from '@/lib/queue/redis'
import { nanoid }                    from 'nanoid'
import type { ExecEvent }            from '@/types/ops'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60

// ── Classify whether a goal needs async queuing ────────────────────────────────

function requiresQueueing(text: string): boolean {
  const lower = text.toLowerCase()
  // Browser tasks benefit from async processing
  return (
    /\b(browse|scrape|screenshot|navigate to|open.*website|extract from url)\b/i.test(lower) ||
    // Multi-stage workflows > 6 steps are better queued
    text.split(/\band\b|\bthen\b|\bafter\b/i).length > 4
  )
}

// ── GET — execution history ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const supabase = await createClient()
    const userId   = auth.supabaseUserId ?? auth.ctx.userId
    const limit    = Number(req.nextUrl.searchParams.get('limit') ?? '20')

    const { data, error } = await supabase
      .from('ops_executions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// ── POST — start execution ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── STEP 1: CORE Auth Validation ────────────────────────────────────────────
  const auth = await resolveAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await req.json() as { text?: string; source?: string; async?: boolean }
  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const userId   = auth.supabaseUserId ?? auth.ctx.userId
  const source   = (body.source as 'voice' | 'api' | 'scheduled' | 'automation') ?? 'api'
  const useQueue = body.async === true || (isRedisConfigured() && requiresQueueing(body.text))

  // ── STEP 5: Queue mode (for browser/long tasks) ────────────────────────────
  if (useQueue) {
    const planId = nanoid(12)
    const job = await enqueue('execute_plan', {
      goal:   body.text,
      planId,
      source,
      userId,
      orgId:  auth.ctx.orgId,
    }, userId, { orgId: auth.ctx.orgId })

    return NextResponse.json({
      queued:  true,
      jobId:   job.id,
      planId,
      message: `Execution queued — will process in next cron run`,
      status:  'queued',
    })
  }

  // ── Streaming SSE mode (short tasks, runs inline) ──────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ExecEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch { /* controller closed */ }
      }

      const pipeline = new ExecutionPipeline(body.text!, userId, source, send)
      const planId   = pipeline.planId

      send({
        type:    'plan_created',
        planId,
        message: `🔐 CORE-validated · Execution started: ${planId}`,
        data:    { coreUser: auth.ctx.email, org: auth.ctx.orgName },
        timestamp: new Date().toISOString(),
      })

      try {
        const plan = await pipeline.run()

        // Persist to Supabase
        const supabase = await createClient()
        const insertResult = await supabase.from('ops_executions').insert({
          id:           plan.id,
          user_id:      userId,
          goal:         plan.goal,
          raw_text:     plan.rawText,
          steps:        plan.steps,
          status:       plan.status,
          result:       plan.result,
          error:        plan.error,
          source:       plan.source,
          started_at:   plan.startedAt,
          completed_at: plan.completedAt,
          duration_ms:  plan.durationMs,
        })
        if (insertResult.error) console.warn('[execute] persist error:', insertResult.error.message)

      } catch (err) {
        send({
          type:      'plan_failed',
          planId,
          message:   (err as Error).message,
          timestamp: new Date().toISOString(),
        })
      }

      try { controller.close() } catch { /* already closed */ }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
