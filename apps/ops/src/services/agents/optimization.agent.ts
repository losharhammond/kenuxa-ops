/**
 * KENUXA OPS — Optimization Agent (Phase 4)
 *
 * Responsibilities:
 *  - Analyze completed execution plans for efficiency patterns
 *  - Reduce execution cost (fewer steps, faster tools)
 *  - Reduce execution time (identify parallelizable steps)
 *  - Learn from failures and suggest better routing
 *  - Generate workflow optimization recommendations
 */
import { fastJSON } from '@/lib/groq/client'
import type { AgentTask, AgentResult, ExecStep, ExecPlan } from '@/types/ops'

export interface OptimizationReport {
  planId:          string
  originalSteps:   number
  suggestions:     OptimizationSuggestion[]
  estimatedSaving: string
  efficiency:      number   // 0-100 score
}

export interface OptimizationSuggestion {
  type:        'merge' | 'parallelize' | 'remove_redundant' | 'cache' | 'reroute'
  stepIds:     string[]
  description: string
  impact:      'high' | 'medium' | 'low'
}

export async function runOptimizationAgent(task: AgentTask): Promise<AgentResult> {
  const start = Date.now()

  try {
    let output: unknown

    switch (task.action) {
      case 'analyze_plan':
        output = await actionAnalyzePlan(task)
        break

      case 'optimize_steps':
        output = await actionOptimizeSteps(task)
        break

      case 'analyze_failure':
        output = await actionAnalyzeFailure(task)
        break

      case 'score_execution':
        output = await actionScoreExecution(task)
        break

      default:
        output = { skipped: true, reason: `Optimization action not recognized: ${task.action}` }
    }

    return {
      agentType:  'optimization',
      taskId:     task.id,
      success:    true,
      output,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      agentType:  'optimization',
      taskId:     task.id,
      success:    false,
      error:      (err as Error).message,
      durationMs: Date.now() - start,
    }
  }
}

// ── Action implementations ─────────────────────────────────────────────────────

async function actionAnalyzePlan(task: AgentTask): Promise<OptimizationReport | { error: string }> {
  const steps   = task.payload['steps']  as ExecStep[] | undefined
  const planId  = task.payload['planId'] as string     ?? task.planId ?? 'unknown'
  const goal    = task.payload['goal']   as string     ?? ''

  if (!steps || steps.length === 0) {
    return { error: 'No steps to analyze' }
  }

  try {
    const report = await fastJSON<{
      suggestions: OptimizationSuggestion[]
      estimatedSaving: string
      efficiency: number
    }>(
      'You are a workflow optimization engine. Analyze execution plans and suggest concrete improvements.',
      `Analyze this ${steps.length}-step execution plan for the goal: "${goal.slice(0, 100)}"

Steps:
${steps.map(s => `  [${s.index}] ${s.type}: ${s.label} (tool: ${s.tool})`).join('\n')}

Return JSON:
{
  "suggestions": [
    {
      "type": "merge|parallelize|remove_redundant|cache|reroute",
      "stepIds": ["id1", "id2"],
      "description": "What to change and why",
      "impact": "high|medium|low"
    }
  ],
  "estimatedSaving": "e.g. '40% faster with 2 parallel steps'",
  "efficiency": 75
}

Focus on: step merging, parallelization opportunities, redundant AI calls, tool selection.`,
      { temperature: 0.1 }
    )

    return {
      planId,
      originalSteps:   steps.length,
      suggestions:     report?.suggestions ?? [],
      estimatedSaving: report?.estimatedSaving ?? 'No changes needed',
      efficiency:      report?.efficiency ?? 80,
    }
  } catch {
    // Non-fatal — return minimal report
    return {
      planId,
      originalSteps:   steps.length,
      suggestions:     [],
      estimatedSaving: 'Analysis unavailable',
      efficiency:      70,
    }
  }
}

async function actionOptimizeSteps(task: AgentTask): Promise<{ optimizedSteps: ExecStep[]; changes: string[] }> {
  const steps = task.payload['steps'] as ExecStep[] | undefined
  if (!steps) return { optimizedSteps: [], changes: [] }

  const changes: string[] = []

  // Remove duplicate consecutive web searches
  const optimized = steps.filter((step, i) => {
    if (i === 0) return true
    const prev = steps[i - 1]!
    if (step.type === 'web_search' && prev.type === 'web_search' &&
        step.input['query'] === prev.input['query']) {
      changes.push(`Removed duplicate web_search at step ${i}`)
      return false
    }
    return true
  })

  // Re-index
  optimized.forEach((s, i) => { s.index = i })

  return { optimizedSteps: optimized, changes }
}

async function actionAnalyzeFailure(task: AgentTask): Promise<{
  classification: string
  rootCause:      string
  recommendation: string
  shouldRetry:    boolean
}> {
  const error   = task.payload['error']   as string ?? 'Unknown error'
  const stepType = task.payload['stepType'] as string ?? 'unknown'
  const context  = task.payload['context'] as string ?? ''

  try {
    const analysis = await fastJSON<{
      classification: string
      rootCause:      string
      recommendation: string
      shouldRetry:    boolean
    }>(
      'You are a failure analysis engine for AI workflow systems.',
      `Analyze this execution failure:
Error: "${error}"
Step type: ${stepType}
Context: ${context.slice(0, 300)}

Return JSON:
{
  "classification": "network|timeout|auth|validation|rate_limit|worker_offline|unknown",
  "rootCause": "brief root cause description",
  "recommendation": "specific action to resolve",
  "shouldRetry": true/false
}`,
      { temperature: 0.05 }
    )

    return analysis ?? {
      classification: 'unknown',
      rootCause:      error,
      recommendation: 'Review the error and retry if transient',
      shouldRetry:    true,
    }
  } catch {
    return {
      classification: 'unknown',
      rootCause:      error,
      recommendation: 'Retry with exponential backoff',
      shouldRetry:    true,
    }
  }
}

async function actionScoreExecution(task: AgentTask): Promise<{
  score: number
  breakdown: Record<string, number>
  verdict: string
}> {
  const plan = task.payload['plan'] as ExecPlan | undefined
  if (!plan) return { score: 0, breakdown: {}, verdict: 'No plan provided' }

  const completed = plan.steps.filter(s => s.status === 'completed').length
  const failed    = plan.steps.filter(s => s.status === 'failed').length
  const total     = plan.steps.length

  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const durationScore  = plan.durationMs
    ? Math.max(0, 100 - Math.floor(plan.durationMs / 1000))
    : 50
  const errorPenalty   = failed * 15

  const score = Math.max(0, Math.min(100,
    completionRate * 0.6 + durationScore * 0.3 + (100 - errorPenalty) * 0.1
  ))

  return {
    score:     Math.round(score),
    breakdown: {
      completion:  Math.round(completionRate),
      speed:       durationScore,
      reliability: Math.round(100 - errorPenalty),
    },
    verdict:
      score >= 90 ? 'Excellent' :
      score >= 70 ? 'Good'      :
      score >= 50 ? 'Fair'      :
      'Needs improvement',
  }
}
