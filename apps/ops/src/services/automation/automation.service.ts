/**
 * KENUXA OPS — Automation Service
 * Execute workflows step-by-step
 */
import { createServiceClient } from '@/lib/supabase/server'
import type { Workflow, WorkflowRun, WorkflowStep } from '@/types/ops'

// ── Execute a workflow ─────────────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: Workflow,
  userId:   string,
  input:    Record<string, unknown> = {}
): Promise<WorkflowRun> {
  const supabase  = await createServiceClient()
  const startTime = Date.now()

  // Create run record
  const { data: runData, error: runErr } = await supabase
    .from('ops_workflow_runs')
    .insert({
      workflow_id: workflow.id,
      user_id:     userId,
      status:      'running',
      trigger:     input['trigger'] as string ?? 'manual',
      input,
    })
    .select()
    .single()

  if (runErr) throw runErr

  const runId      = (runData as { id: string }).id
  const stepResults: WorkflowRun['stepResults'] = []

  try {
    let context = { ...input }

    for (const step of workflow.steps) {
      const stepStart = Date.now()
      try {
        const output = await executeStep(step, context, userId)
        context = { ...context, ...output }

        stepResults.push({
          stepId:     step.id,
          status:     'completed',
          output,
          durationMs: Date.now() - stepStart,
        })
      } catch (stepErr) {
        stepResults.push({
          stepId:     step.id,
          status:     'failed',
          output:     { error: (stepErr as Error).message },
          durationMs: Date.now() - stepStart,
        })
        throw stepErr  // fail fast
      }
    }

    // Mark complete
    const { data: completed } = await supabase
      .from('ops_workflow_runs')
      .update({
        status:       'completed',
        output:       context,
        step_results: stepResults,
        completed_at: new Date().toISOString(),
        duration_ms:  Date.now() - startTime,
      })
      .eq('id', runId)
      .select()
      .single()

    // Update workflow stats
    await supabase
      .from('ops_workflows')
      .update({
        run_count:    workflow.runCount + 1,
        success_count: workflow.successCount + 1,
        last_run_at:  new Date().toISOString(),
        last_status:  'completed',
      })
      .eq('id', workflow.id)

    return dbToRun(completed as Record<string, unknown>)
  } catch (err) {
    const { data: failed } = await supabase
      .from('ops_workflow_runs')
      .update({
        status:       'failed',
        error:        (err as Error).message,
        step_results: stepResults,
        completed_at: new Date().toISOString(),
        duration_ms:  Date.now() - startTime,
      })
      .eq('id', runId)
      .select()
      .single()

    await supabase
      .from('ops_workflows')
      .update({
        run_count:   workflow.runCount + 1,
        last_run_at: new Date().toISOString(),
        last_status: 'failed',
      })
      .eq('id', workflow.id)

    return dbToRun(failed as Record<string, unknown>)
  }
}

// ── Execute a single step ──────────────────────────────────────────────────────

async function executeStep(
  step:    WorkflowStep,
  context: Record<string, unknown>,
  userId:  string
): Promise<Record<string, unknown>> {
  switch (step.type) {
    case 'wait': {
      const ms = Number(step.config['ms'] ?? 1000)
      await new Promise(r => setTimeout(r, ms))
      return {}
    }

    case 'email': {
      const res = await fetch('/api/email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action: 'send',
          to:      interpolate(step.config['to'] as string, context),
          subject: interpolate(step.config['subject'] as string, context),
          body:    interpolate(step.config['body']    as string, context),
        }),
      })
      const json = await res.json() as { data?: unknown }
      return { email_result: json.data }
    }

    case 'command': {
      const res = await fetch('/api/commands', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rawText: interpolate(step.config['command'] as string, context) }),
      })
      const json = await res.json() as { result?: unknown }
      return { command_result: json.result }
    }

    case 'http': {
      const url    = interpolate(step.config['url'] as string, context)
      const method = (step.config['method'] as string) ?? 'GET'
      const res    = await fetch(url, {
        method,
        headers: step.config['headers'] as HeadersInit ?? {},
        body:    method !== 'GET' ? JSON.stringify(step.config['body']) : undefined,
      })
      const data = await res.json()
      return { http_result: data }
    }

    case 'memory': {
      const res = await fetch('/api/memory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action: step.config['action'],
          type:   step.config['type'],
          key:    step.config['key'],
          value:  interpolate(step.config['value'] as string, context),
        }),
      })
      const json = await res.json() as { data?: unknown }
      return { memory_result: json.data }
    }

    case 'condition': {
      const field    = step.config['field']    as string
      const operator = step.config['operator'] as string
      const val      = step.config['value']
      const actual   = context[field]

      let passes = false
      if (operator === 'eq')       passes = actual === val
      if (operator === 'neq')      passes = actual !== val
      if (operator === 'gt')       passes = Number(actual) > Number(val)
      if (operator === 'contains') passes = String(actual).includes(String(val))

      return { condition_result: passes }
    }

    default:
      return {}
  }
}

/** Simple template interpolation: {{key}} */
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? ''))
}

function dbToRun(row: Record<string, unknown>): WorkflowRun {
  return {
    id:          row['id']           as string,
    workflowId:  row['workflow_id']  as string,
    userId:      row['user_id']      as string,
    status:      row['status']       as WorkflowRun['status'],
    trigger:     row['trigger']      as string | undefined,
    input:       (row['input']       as Record<string, unknown>) ?? {},
    output:      (row['output']      as Record<string, unknown>) ?? {},
    stepResults: (row['step_results'] as WorkflowRun['stepResults']) ?? [],
    error:       row['error']        as string | undefined,
    startedAt:   row['started_at']   as string,
    completedAt: row['completed_at'] as string | undefined,
    durationMs:  row['duration_ms']  as number | undefined,
  }
}

// ── List user workflows ────────────────────────────────────────────────────────

export async function getUserWorkflows(userId: string): Promise<Workflow[]> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('ops_workflows')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(row => dbToWorkflow(row as Record<string, unknown>))
}

function dbToWorkflow(row: Record<string, unknown>): Workflow {
  return {
    id:            row['id']             as string,
    userId:        row['user_id']        as string,
    name:          row['name']           as string,
    description:   row['description']   as string | undefined,
    triggerType:   row['trigger_type']  as Workflow['triggerType'],
    triggerConfig: (row['trigger_config'] as Record<string, unknown>) ?? {},
    steps:         (row['steps']         as WorkflowStep[]) ?? [],
    isActive:      row['is_active']      as boolean,
    runCount:      row['run_count']      as number,
    successCount:  row['success_count']  as number,
    lastRunAt:     row['last_run_at']    as string | undefined,
    lastStatus:    row['last_status']    as string | undefined,
    tags:          (row['tags']          as string[]) ?? [],
    createdAt:     row['created_at']     as string,
    updatedAt:     row['updated_at']     as string,
  }
}
