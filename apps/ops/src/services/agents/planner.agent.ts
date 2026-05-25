/**
 * KENUXA OPS — Planner Agent (Phase 4)
 *
 * Responsibilities:
 *  - Decompose natural-language goals into ExecStep arrays
 *  - Build DAG execution graphs from steps
 *  - Select optimal tools for each step
 *  - Define workflow structure and dependencies
 */
import { nanoid }       from 'nanoid'
import { decomposeGoal } from '@/services/execution/decomposer.service'
import { buildDag }      from '@/services/dag/dag.engine'
import type { AgentTask, AgentResult, ExecStep, DagGraph } from '@/types/ops'

export interface PlannerOutput {
  steps:    ExecStep[]
  dag:      DagGraph
  planId:   string
  strategy: string
}

export async function runPlannerAgent(task: AgentTask): Promise<AgentResult> {
  const start = Date.now()

  try {
    const goal   = task.payload['goal'] as string
    const planId = (task.payload['planId'] as string) ?? nanoid(12)

    if (!goal) throw new Error('Planner agent: goal is required')

    // Decompose goal into atomic steps
    const steps = await decomposeGoal(goal)

    // Build DAG (handles dependency resolution + parallel grouping)
    const dag = buildDag(steps, planId, task.userId)

    // Determine execution strategy
    const hasParallel = dag.nodes.some(n => n.dependsOn.length === 0 && dag.nodes.indexOf(n) > 0)
    const strategy    = hasParallel ? 'parallel-dag' : 'sequential'

    const output: PlannerOutput = { steps, dag, planId, strategy }

    return {
      agentType:  'planner',
      taskId:     task.id,
      success:    true,
      output,
      durationMs: Date.now() - start,
      metadata:   { stepCount: steps.length, strategy },
    }
  } catch (err) {
    return {
      agentType:  'planner',
      taskId:     task.id,
      success:    false,
      error:      (err as Error).message,
      durationMs: Date.now() - start,
    }
  }
}
