/**
 * KENUXA OPS — DAG Execution Engine (Phase 3)
 *
 * Builds and executes Directed Acyclic Graphs for workflow steps.
 * Supports:
 *  - Parallel execution of independent nodes
 *  - Sequential execution of dependent nodes
 *  - Context propagation between steps
 *  - Per-node retry on failure
 *  - Topological sort validation (cycle detection)
 */
import { nanoid }       from 'nanoid'
import { executeStep }  from '@/services/execution/executor.service'
import type {
  DagGraph, DagNode, ExecStep, ExecStepType,
  ExecPlanStatus, ExecStepStatus,
} from '@/types/ops'

// ── Build DAG from ExecSteps ───────────────────────────────────────────────────

/**
 * Convert a flat list of ExecSteps into a DAG.
 * By default, steps have sequential dependencies (each depends on the previous).
 * Steps tagged with `input.depends_on = []` become parallel roots.
 */
export function buildDag(steps: ExecStep[], planId: string, userId: string): DagGraph {
  const nodes: DagNode[] = steps.map((step, i) => ({
    id:          step.id,
    stepType:    step.type    as ExecStepType,
    label:       step.label,
    tool:        step.tool,
    input:       step.input,
    // Explicit depends_on in input overrides default sequential deps
    dependsOn:   Array.isArray(step.input['depends_on'])
      ? (step.input['depends_on'] as string[])
      : i > 0
        ? [steps[i - 1]!.id]  // default: sequential
        : [],
    status:      'pending' as ExecStepStatus,
  }))

  return {
    id:        nanoid(12),
    planId,
    userId,
    nodes,
    status:    'planning' as ExecPlanStatus,
    startedAt: new Date().toISOString(),
  }
}

// ── Topological sort (Kahn's algorithm) ───────────────────────────────────────

export function topologicalSort(nodes: DagNode[]): DagNode[] {
  const nodeMap  = new Map<string, DagNode>(nodes.map(n => [n.id, n]))
  const inDegree = new Map<string, number>(nodes.map(n => [n.id, 0]))

  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (!nodeMap.has(dep)) continue  // missing dep — treat as satisfied
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1)
    }
  }

  const queue  = nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0)
  const sorted: DagNode[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)

    // Decrease in-degree of dependents
    for (const other of nodes) {
      if (other.dependsOn.includes(node.id)) {
        const newDeg = (inDegree.get(other.id) ?? 0) - 1
        inDegree.set(other.id, newDeg)
        if (newDeg === 0) queue.push(other)
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('DAG has a cycle — cannot execute')
  }

  return sorted
}

// ── Ready nodes (all deps completed) ──────────────────────────────────────────

function getReadyNodes(graph: DagGraph): DagNode[] {
  const completedIds = new Set(
    graph.nodes.filter(n => n.status === 'completed').map(n => n.id)
  )

  return graph.nodes.filter(
    n => n.status === 'pending' &&
         n.dependsOn.every(dep => completedIds.has(dep))
  )
}

// ── Collect context from completed nodes ───────────────────────────────────────

function buildContext(graph: DagGraph): Record<number, unknown> {
  const context: Record<number, unknown> = {}
  graph.nodes.forEach((node, i) => {
    if (node.output !== undefined) context[i] = node.output
  })
  return context
}

// ── Execute a single DAG node ─────────────────────────────────────────────────

async function executeNode(
  node:    DagNode,
  context: Record<number, unknown>,
  userId:  string
): Promise<unknown> {
  // Build an ExecStep from the DagNode for the existing executor
  const step: ExecStep = {
    id:     node.id,
    index:  0,
    type:   node.stepType,
    label:  node.label,
    tool:   node.tool,
    input:  node.input,
    status: 'running',
  }
  return executeStep(step, context, userId)
}

// ── Main DAG execution ─────────────────────────────────────────────────────────

export type DagEventCallback = (event: {
  type:    'node_start' | 'node_complete' | 'node_failed' | 'dag_complete' | 'dag_failed' | 'log'
  nodeId?: string
  graph:   DagGraph
  message?: string
}) => void

export async function executeDag(
  graph:   DagGraph,
  onEvent: DagEventCallback
): Promise<DagGraph> {
  graph.status = 'executing'

  // Validate: topological sort (throws on cycle)
  try {
    topologicalSort(graph.nodes)
  } catch (err) {
    graph.status = 'failed'
    onEvent({ type: 'dag_failed', graph, message: (err as Error).message })
    return graph
  }

  onEvent({ type: 'log', graph, message: `🕸️ DAG: ${graph.nodes.length} nodes, starting execution` })

  let iteration = 0
  const MAX_ITERATIONS = graph.nodes.length * 2 + 5  // safety valve

  while (iteration++ < MAX_ITERATIONS) {
    // Check for completion
    const allDone    = graph.nodes.every(n => n.status === 'completed' || n.status === 'failed' || n.status === 'skipped')
    const anyFailed  = graph.nodes.some(n => n.status === 'failed')
    const anyCritical = graph.nodes
      .filter(n => n.status === 'failed')
      .some(n => ['email_send', 'http_request'].includes(n.stepType))

    if (allDone || anyCritical) {
      const finalStatus: ExecPlanStatus = graph.nodes.every(n => n.status !== 'failed') ? 'completed' : 'failed'
      graph.status      = finalStatus
      graph.completedAt = new Date().toISOString()
      const completedNodes = graph.nodes.filter((n: DagNode) => n.status === 'completed')
      graph.result      = completedNodes[completedNodes.length - 1]?.output

      onEvent({
        type:    finalStatus === 'completed' ? 'dag_complete' : 'dag_failed',
        graph,
        message: `DAG ${finalStatus}: ${graph.nodes.filter(n => n.status === 'completed').length}/${graph.nodes.length} nodes completed`,
      })
      break
    }

    // Get all ready nodes (parallel execution wave)
    const ready = getReadyNodes(graph)
    if (ready.length === 0) {
      // No progress — likely all remaining nodes have failed deps
      const blocked = graph.nodes.filter(n => n.status === 'pending')
      for (const node of blocked) node.status = 'skipped'
      continue
    }

    const context = buildContext(graph)

    // Execute ready nodes in parallel
    await Promise.allSettled(
      ready.map(async (node) => {
        node.status    = 'running'
        node.startedAt = new Date().toISOString()
        onEvent({ type: 'node_start', nodeId: node.id, graph, message: `⚡ ${node.label}` })

        try {
          const output     = await executeNode(node, context, graph.userId)
          node.output      = output
          node.status      = 'completed'
          node.completedAt = new Date().toISOString()
          node.durationMs  = Date.now() - new Date(node.startedAt).getTime()

          onEvent({ type: 'node_complete', nodeId: node.id, graph, message: `✅ ${node.label}` })
        } catch (err) {
          node.status    = 'failed'
          node.error     = (err as Error).message
          node.completedAt = new Date().toISOString()
          node.durationMs  = Date.now() - new Date(node.startedAt!).getTime()

          onEvent({ type: 'node_failed', nodeId: node.id, graph, message: `❌ ${node.label}: ${node.error}` })
        }
      })
    )
  }

  return graph
}

// ── Convert DagGraph ↔ ExecPlan format ────────────────────────────────────────

export function dagGraphToSteps(graph: DagGraph): ExecStep[] {
  return graph.nodes.map((node, i): ExecStep => ({
    id:          node.id,
    index:       i,
    type:        node.stepType,
    label:       node.label,
    tool:        node.tool,
    input:       node.input,
    output:      node.output,
    status:      node.status  as ExecStep['status'],
    error:       node.error,
    startedAt:   node.startedAt,
    completedAt: node.completedAt,
    durationMs:  node.durationMs,
  }))
}
