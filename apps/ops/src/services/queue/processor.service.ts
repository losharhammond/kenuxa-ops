/**
 * KENUXA OPS — Queue Processor Service (Phase 3)
 *
 * Called by the Vercel Cron endpoint every 30 seconds.
 * Drains up to MAX_JOBS_PER_RUN jobs from the Redis queue,
 * routes each job to the correct handler, and updates state in Supabase.
 */
import { dequeue, completeJob, failJob, getQueueStats } from './queue.service'
import { buildDag, executeDag, dagGraphToSteps }         from '@/services/dag/dag.engine'
import { dispatchToWorker, mapBrowserAction }            from '@/services/worker/playwright.client'
import { decomposeGoal }                                 from '@/services/execution/decomposer.service'
import { executeStep }                                   from '@/services/execution/executor.service'
import type { QueueJob, ExecStep }                        from '@/types/ops'

// Re-export StepContext for use in processor
type StepCtx = Record<number, unknown>

const MAX_JOBS_PER_RUN = 5  // process max N jobs per cron invocation

export interface ProcessorResult {
  processed: number
  succeeded: number
  failed:    number
  skipped:   number
  errors:    string[]
}

// ── Main processor ─────────────────────────────────────────────────────────────

export async function processQueue(userId?: string): Promise<ProcessorResult> {
  const result: ProcessorResult = {
    processed: 0,
    succeeded: 0,
    failed:    0,
    skipped:   0,
    errors:    [],
  }

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const job = await dequeue()
    if (!job) break  // queue empty

    // Filter by user if specified (for user-specific processing)
    if (userId && job.userId !== userId) {
      result.skipped++
      continue
    }

    result.processed++

    try {
      const jobResult = await routeJob(job)
      await completeJob(job, jobResult)
      result.succeeded++
    } catch (err) {
      const errMsg = (err as Error).message
      result.errors.push(`${job.id} (${job.type}): ${errMsg}`)
      await failJob(job, errMsg)
      result.failed++
    }
  }

  return result
}

// ── Job router ─────────────────────────────────────────────────────────────────

async function routeJob(job: QueueJob): Promise<unknown> {
  console.info(`[processor] routing job ${job.id} (${job.type})`)

  switch (job.type) {
    case 'execute_plan':
      return processExecutePlan(job)

    case 'execute_step':
      return processExecuteStep(job)

    case 'browser_task':
      return processBrowserTask(job)

    case 'email_task':
      return processEmailTask(job)

    case 'workflow_run':
      return processWorkflowRun(job)

    case 'memory_task':
      return processMemoryTask(job)

    case 'health_check':
      return processHealthCheck()

    case 'cron_workflow':
      return processCronWorkflow(job)

    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

// ── Handlers ───────────────────────────────────────────────────────────────────

async function processExecutePlan(job: QueueJob): Promise<unknown> {
  const goal   = job.payload['goal']   as string
  const source = job.payload['source'] as string ?? 'scheduled'

  if (!goal) throw new Error('execute_plan job missing goal')

  // Decompose into steps
  const steps = await decomposeGoal(goal)

  // Build and execute DAG
  const dag = buildDag(steps, job.payload['planId'] as string ?? job.id, job.userId)

  const events: string[] = []
  const completedDag = await executeDag(dag, (event) => {
    events.push(event.message ?? event.type)
  })

  // Persist to Supabase
  await persistExecutionResult(job, completedDag, steps)

  return {
    planId: dag.planId,
    status: completedDag.status,
    steps:  dagGraphToSteps(completedDag).length,
    result: completedDag.result,
    events: events.slice(-10),
  }
}

async function processExecuteStep(job: QueueJob): Promise<unknown> {
  const step    = job.payload['step']    as ExecStep
  const context = (job.payload['context'] as StepCtx) ?? {}

  if (!step) throw new Error('execute_step job missing step')

  return executeStep(step, context, job.userId)
}

async function processBrowserTask(job: QueueJob): Promise<unknown> {
  const action = mapBrowserAction(job.payload['action'] as string)
  const input  = (job.payload['input']  as Record<string, unknown>) ?? {}

  const response = await dispatchToWorker({ action, input, jobId: job.id })

  if (!response.success) {
    throw new Error(response.error ?? 'Browser task failed')
  }

  return response.result
}

async function processEmailTask(job: QueueJob): Promise<unknown> {
  const action  = job.payload['action']  as string
  const payload = job.payload['payload'] as Record<string, unknown>

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'

  const res = await fetch(`${appUrl}/api/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })

  if (!res.ok) throw new Error(`Email API returned ${res.status}`)

  return res.json()
}

async function processWorkflowRun(job: QueueJob): Promise<unknown> {
  const workflowId = job.payload['workflowId'] as string
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'

  const res = await fetch(`${appUrl}/api/automation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action:      'run',
      workflow_id: workflowId,
      trigger:     'scheduled',
    }),
  })

  if (!res.ok) throw new Error(`Automation API returned ${res.status}`)
  return res.json()
}

async function processMemoryTask(job: QueueJob): Promise<unknown> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
  const res = await fetch(`${appUrl}/api/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job.payload),
  })
  if (!res.ok) throw new Error(`Memory API returned ${res.status}`)
  return res.json()
}

async function processHealthCheck(): Promise<unknown> {
  const { runHealthCheck } = await import('./health.service')
  return runHealthCheck()
}

async function processCronWorkflow(job: QueueJob): Promise<unknown> {
  // Re-use workflow_run handler
  return processWorkflowRun({
    ...job,
    type: 'workflow_run',
  })
}

// ── Persist execution result to Supabase ───────────────────────────────────────

async function persistExecutionResult(
  job:   QueueJob,
  dag:   import('@/types/ops').DagGraph,
  steps: ExecStep[]
): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    await supabase.from('ops_executions').upsert({
      id:           dag.planId,
      user_id:      job.userId,
      goal:         job.payload['goal'] as string,
      raw_text:     job.payload['goal'] as string,
      steps:        dagGraphToSteps(dag),
      status:       dag.status,
      result:       dag.result,
      source:       (job.payload['source'] as string) ?? 'scheduled',
      started_at:   dag.startedAt,
      completed_at: dag.completedAt,
      duration_ms:  dag.completedAt
        ? Date.now() - new Date(dag.startedAt).getTime()
        : undefined,
    })
  } catch (err) {
    console.error('[processor] persist error:', (err as Error).message)
  }
}
