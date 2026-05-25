/**
 * KENUXA OPS — Agent Orchestrator (Phase 4)
 *
 * Central coordination layer for all 5 specialized agents:
 *   1. Planner       — builds DAG, selects tools
 *   2. Browser       — controls Playwright worker
 *   3. Communication — Outlook email (primary) + messaging
 *   4. Memory        — Supabase reads/writes + context
 *   5. Optimization  — workflow efficiency + failure learning
 *
 * Agents communicate via the orchestrator.
 * The orchestrator routes tasks, collects results, and aggregates state.
 */
import { nanoid }                   from 'nanoid'
import { runPlannerAgent }          from './planner.agent'
import { runBrowserAgent }          from './browser.agent'
import { runCommunicationAgent }    from './communication.agent'
import { runMemoryAgent }           from './memory.agent'
import { runOptimizationAgent }     from './optimization.agent'
import type {
  AgentType, AgentTask, AgentResult, AgentEvent, AgentState,
} from '@/types/ops'

// ── In-memory agent state (per-process, stateless across requests) ─────────────

const agentStates = new Map<AgentType, AgentState>()

function initState(type: AgentType): AgentState {
  return { type, status: 'idle', tasksRun: 0, errors: 0 }
}

export function getAgentState(type: AgentType): AgentState {
  return agentStates.get(type) ?? initState(type)
}

export function getAllAgentStates(): AgentState[] {
  const types: AgentType[] = ['planner', 'browser', 'communication', 'memory', 'optimization']
  return types.map(t => agentStates.get(t) ?? initState(t))
}

// ── Main dispatch ──────────────────────────────────────────────────────────────

type EventCallback = (event: AgentEvent) => void

export async function dispatchToAgent(
  agentType:  AgentType,
  action:     string,
  payload:    Record<string, unknown>,
  userId:     string,
  opts?: {
    planId?:   string
    stepId?:   string
    onEvent?:  EventCallback
  }
): Promise<AgentResult> {
  const task: AgentTask = {
    id:        nanoid(10),
    agentType,
    action,
    payload,
    userId,
    planId:    opts?.planId,
    stepId:    opts?.stepId,
  }

  const emit = (type: AgentEvent['type'], message?: string, data?: unknown) => {
    opts?.onEvent?.({
      type,
      agentType,
      taskId:    task.id,
      planId:    opts.planId,
      message,
      data,
      timestamp: new Date().toISOString(),
    })
  }

  // Update agent state to running
  agentStates.set(agentType, {
    ...getAgentState(agentType),
    status:      'running',
    currentTask: action,
  })

  emit('agent_start', `🤖 ${agentType} agent starting: ${action}`)

  try {
    const result = await routeToAgent(agentType, task)

    // Update success state
    const prev = getAgentState(agentType)
    agentStates.set(agentType, {
      ...prev,
      status:      result.success ? 'completed' : 'failed',
      currentTask: undefined,
      lastRunAt:   new Date().toISOString(),
      tasksRun:    prev.tasksRun + 1,
      errors:      result.success ? prev.errors : prev.errors + 1,
    })

    if (result.success) {
      emit('agent_complete', `✅ ${agentType} agent completed (${result.durationMs}ms)`, result.output)
    } else {
      emit('agent_failed', `❌ ${agentType} agent failed: ${result.error}`)
    }

    return result
  } catch (err) {
    const prev = getAgentState(agentType)
    agentStates.set(agentType, {
      ...prev,
      status:      'failed',
      currentTask: undefined,
      lastRunAt:   new Date().toISOString(),
      tasksRun:    prev.tasksRun + 1,
      errors:      prev.errors + 1,
    })

    const error = (err as Error).message
    emit('agent_failed', `❌ ${agentType} orchestration error: ${error}`)

    return {
      agentType,
      taskId:     task.id,
      success:    false,
      error,
      durationMs: 0,
    }
  }
}

// ── Agent router ───────────────────────────────────────────────────────────────

async function routeToAgent(type: AgentType, task: AgentTask): Promise<AgentResult> {
  switch (type) {
    case 'planner':       return runPlannerAgent(task)
    case 'browser':       return runBrowserAgent(task)
    case 'communication': return runCommunicationAgent(task)
    case 'memory':        return runMemoryAgent(task)
    case 'optimization':  return runOptimizationAgent(task)
    default:
      throw new Error(`Unknown agent type: ${type}`)
  }
}

// ── High-level orchestration helpers ──────────────────────────────────────────

/** Run multiple agents in parallel and collect all results */
export async function runAgentsParallel(
  tasks: Array<{ agentType: AgentType; action: string; payload: Record<string, unknown> }>,
  userId: string,
  opts?: { planId?: string; onEvent?: EventCallback }
): Promise<AgentResult[]> {
  return Promise.all(
    tasks.map(t =>
      dispatchToAgent(t.agentType, t.action, t.payload, userId, opts)
    )
  )
}

/** Result aggregation: merge outputs from multiple agent results */
export function aggregateResults(results: AgentResult[]): {
  success:    boolean
  merged:     Record<string, unknown>
  failed:     string[]
  durationMs: number
} {
  const merged: Record<string, unknown> = {}
  const failed: string[] = []
  let totalDuration = 0

  for (const result of results) {
    totalDuration += result.durationMs
    if (!result.success) {
      failed.push(`${result.agentType}: ${result.error}`)
    } else {
      merged[result.agentType] = result.output
    }
  }

  return {
    success:    failed.length === 0,
    merged,
    failed,
    durationMs: totalDuration,
  }
}
