/**
 * GET  /api/agents — Get all agent states
 * POST /api/agents — Dispatch a task to a specific agent
 *
 * Phase 4: Multi-agent system management API
 */
import { NextRequest, NextResponse }    from 'next/server'
import { resolveAuth }                  from '@/lib/core/auth'
import {
  getAllAgentStates,
  dispatchToAgent,
}                                       from '@/services/agents/orchestrator.service'
import type { AgentType }               from '@/types/ops'

export const dynamic = 'force-dynamic'

// ── GET — all agent states ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const states = getAllAgentStates()
  return NextResponse.json({ agents: states, count: states.length })
}

// ── POST — dispatch task to agent ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const body = await req.json() as {
      agent:   AgentType
      action:  string
      payload?: Record<string, unknown>
      planId?:  string
    }

    if (!body.agent || !body.action) {
      return NextResponse.json({ error: 'agent and action are required' }, { status: 400 })
    }

    const userId = auth.supabaseUserId ?? auth.ctx.userId

    const result = await dispatchToAgent(
      body.agent,
      body.action,
      body.payload ?? {},
      userId,
      { planId: body.planId }
    )

    return NextResponse.json(result, { status: result.success ? 200 : 502 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
