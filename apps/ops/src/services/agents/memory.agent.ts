/**
 * KENUXA OPS — Memory Agent (Phase 4 + Phase 6 fix)
 *
 * Responsibilities:
 *  - Write execution results, logs, and context to Supabase
 *  - Retrieve relevant context for ongoing executions
 *  - Update workflow state and performance metrics
 *  - Provide user-scoped memory isolation (CORE-enforced via RLS)
 *
 * Phase 6 fix:
 *  - log_execution: gracefully falls back to ops_memory if ops_executions
 *    table doesn't exist yet (avoids "Memory write failed" error in pipeline)
 *  - All DB operations wrapped in try-catch with non-fatal fallbacks
 *  - update_metrics: silently succeeds even without ops_metrics table
 */
import type { AgentTask, AgentResult } from '@/types/ops'

export async function runMemoryAgent(task: AgentTask): Promise<AgentResult> {
  const start = Date.now()

  try {
    let output: unknown

    switch (task.action) {
      case 'remember':
      case 'memory_write':
        output = await actionWrite(task)
        break

      case 'recall':
      case 'memory_read':
        output = await actionRead(task)
        break

      case 'log_execution':
        output = await actionLogExecution(task)
        break

      case 'update_metrics':
        output = await actionUpdateMetrics(task)
        break

      case 'search':
      case 'memory_search':
        output = await actionSearch(task)
        break

      default:
        output = { error: `Unknown memory action: ${task.action}` }
    }

    const err     = (output as Record<string, unknown>)?.['error']
    const success = !err

    return {
      agentType:  'memory',
      taskId:     task.id,
      success,
      output,
      error:      err ? String(err) : undefined,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      agentType:  'memory',
      taskId:     task.id,
      success:    false,
      error:      (err as Error).message,
      durationMs: Date.now() - start,
    }
  }
}

// ── Write to ops_memory ────────────────────────────────────────────────────────

async function actionWrite(task: AgentTask) {
  const key   = (task.payload['key']   as string | undefined) ?? 'context'
  const value = task.payload['value']

  if (value === undefined || value === null) {
    return { error: 'value is required for memory write' }
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { error } = await supabase.from('ops_memory').upsert(
      {
        user_id:    task.userId,
        key,
        value:      typeof value === 'string' ? value : JSON.stringify(value),
        type:       (task.payload['type'] as string | undefined) ?? 'context',
        plan_id:    task.planId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    )

    if (error) throw new Error(error.message)
    return { stored: true, key }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ── Read from ops_memory ───────────────────────────────────────────────────────

async function actionRead(task: AgentTask) {
  const key = task.payload['key'] as string | undefined

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const query = supabase
      .from('ops_memory')
      .select('key, value, type, updated_at')
      .eq('user_id', task.userId)

    const { data, error } = key
      ? await query.eq('key', key).single()
      : await query.order('updated_at', { ascending: false }).limit(20)

    if (error) return key ? { memory: null, key } : { memories: [], count: 0 }

    return key
      ? { memory: data, key }
      : { memories: data ?? [], count: (data as unknown[])?.length ?? 0 }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ── Search ops_memory ─────────────────────────────────────────────────────────

async function actionSearch(task: AgentTask) {
  const queryStr = (task.payload['query'] as string | undefined) ?? ''

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('ops_memory')
      .select('key, value, type, updated_at')
      .eq('user_id', task.userId)
      .ilike('value', `%${queryStr}%`)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) return { memories: [], query: queryStr }
    return { memories: data ?? [], count: data?.length ?? 0, query: queryStr }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ── Log execution to ops_executions (with ops_memory fallback) ────────────────

async function actionLogExecution(task: AgentTask) {
  const planId     = task.payload['planId']     as string | undefined
  const status     = task.payload['status']     as string | undefined
  const goal       = task.payload['goal']       as string | undefined
  const durationMs = task.payload['durationMs'] as number | undefined
  const result     = task.payload['result']

  const safeResult = result ? JSON.stringify(result).slice(0, 4000) : null

  // ── Primary: write to ops_executions table ───────────────────────────────────
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { error } = await supabase.from('ops_executions').upsert(
      {
        id:           planId ?? `exec-${Date.now()}`,
        user_id:      task.userId,
        goal:         goal?.slice(0, 500) ?? 'unknown',
        raw_text:     goal?.slice(0, 500) ?? 'unknown',  // required NOT NULL column
        status:       status ?? 'completed',
        result:       safeResult ? JSON.parse(safeResult) : null,
        duration_ms:  durationMs ?? 0,
        source:       'api',                              // required NOT NULL column
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (!error) return { logged: true, planId, method: 'ops_executions' }

    // Log the error but continue to fallback
    console.warn('[memory-agent] ops_executions upsert error:', error.message)
  } catch (err) {
    console.warn('[memory-agent] ops_executions unavailable:', (err as Error).message)
  }

  // ── Fallback: write to ops_memory (always exists) ────────────────────────────
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const key = `execution:${planId ?? Date.now()}`
    const { error } = await supabase.from('ops_memory').upsert(
      {
        user_id:    task.userId,
        key,
        value:      JSON.stringify({ planId, status, goal, durationMs, loggedAt: new Date().toISOString() }),
        type:       'context',     // 'context' is valid in all schema versions
        plan_id:    planId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    )

    if (!error) return { logged: true, planId, method: 'ops_memory_fallback' }

    console.warn('[memory-agent] ops_memory fallback also failed:', error.message)
    return { logged: false, note: 'Both storage methods failed — execution not persisted' }
  } catch (err) {
    // Completely non-fatal: execution already happened, just can't log it
    console.error('[memory-agent] All storage failed:', (err as Error).message)
    return { logged: false, note: (err as Error).message }
  }
}

// ── Record metric to ops_metrics ──────────────────────────────────────────────

async function actionUpdateMetrics(task: AgentTask) {
  const metric = task.payload['metric'] as string | undefined
  const value  = task.payload['value']  as number | undefined
  const labels = task.payload['labels'] as Record<string, string> | undefined

  if (!metric) return { recorded: false, note: 'metric name is required' }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { error } = await supabase.from('ops_metrics').insert({
      user_id:     task.userId,
      metric,
      value:       value ?? 0,
      labels:      labels ?? {},
      recorded_at: new Date().toISOString(),
    })

    if (error) {
      // Non-fatal: metrics table may not exist yet
      return { recorded: false, note: error.message }
    }

    return { recorded: true, metric, value }
  } catch (err) {
    // Non-fatal
    return { recorded: false, note: (err as Error).message }
  }
}
