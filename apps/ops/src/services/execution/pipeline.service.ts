/**
 * KENUXA OPS — Execution Pipeline (Phase 4)
 *
 * 7-Step AI Execution Pipeline:
 *   STEP 1 — CORE Auth Validation        (handled by route before pipeline runs)
 *   STEP 2 — Intent Analysis             (Groq: classify goal, extract entities)
 *   STEP 3 — System Routing              (map goal → correct agent+tool per system)
 *   STEP 4 — Execution Graph Building    (Planner Agent → DAG creation)
 *   STEP 5 — Queued Execution            (execute steps via correct agents)
 *   STEP 6 — Result Aggregation          (collect + merge + validate all outputs)
 *   STEP 7 — Memory Update               (persist logs, metrics, context to Supabase)
 *
 * Agents used: Planner, Browser, Communication, Memory, Optimization
 */
import { nanoid }            from 'nanoid'
import { decomposeGoal }     from './decomposer.service'
import { executeStep, type StepContext } from './executor.service'
import { dispatchToAgent }   from '@/services/agents/orchestrator.service'
import { fastJSON }          from '@/lib/groq/client'
import type {
  ExecPlan, ExecStep, ExecEvent, CommandSource, AgentEvent,
} from '@/types/ops'

// ── SSE Event Emitter ──────────────────────────────────────────────────────────

type EventCallback = (event: ExecEvent) => void

export class ExecutionPipeline {
  private plan:    ExecPlan
  private onEvent: EventCallback
  private context: StepContext = {}
  private aborted  = false

  constructor(
    rawText: string,
    userId:  string,
    source:  CommandSource,
    onEvent: EventCallback
  ) {
    this.plan = {
      id:          nanoid(12),
      userId,
      goal:        rawText,
      rawText,
      steps:       [],
      status:      'planning',
      currentStep: 0,
      startedAt:   new Date().toISOString(),
      source,
    }
    this.onEvent = onEvent
  }

  get planId(): string { return this.plan.id }

  abort(): void { this.aborted = true }

  // ── Main 7-step run ───────────────────────────────────────────────────────────

  async run(): Promise<ExecPlan> {
    this.emit('plan_created', undefined, `🔐 CORE-validated · Goal received: "${this.plan.goal.slice(0, 60)}"`)

    try {
      // ── STEP 2: Intent Analysis ─────────────────────────────────────────────
      this.emit('log', undefined, '🧠 Step 2/7 — Analysing intent…')
      const intent = await this.analyseIntent(this.plan.goal)
      this.emit('log', { intent }, `📊 Intent: ${intent.category} · Systems: ${intent.systems.join(', ')}`)

      if (this.aborted) { this.plan.status = 'cancelled'; return this.finalize() }

      // ── STEP 3: System Routing ──────────────────────────────────────────────
      this.emit('log', undefined, '🔀 Step 3/7 — Routing to systems…')
      const routingPlan = this.buildRoutingPlan(intent)
      this.emit('log', { routing: routingPlan }, `🗺️ Route: ${routingPlan.primaryAgent} agent · ${routingPlan.tools.join(' + ')}`)

      if (this.aborted) { this.plan.status = 'cancelled'; return this.finalize() }

      // ── STEP 4: Execution Graph Building (Planner Agent) ───────────────────
      this.emit('log', undefined, '📋 Step 4/7 — Building execution graph…')
      const steps = await this.buildExecutionGraph(this.plan.goal, routingPlan)
      this.plan.steps = steps
      this.emit('plan_created', { plan: this.plan }, `📐 ${steps.length} steps planned`)

      if (this.aborted) { this.plan.status = 'cancelled'; return this.finalize() }

      // ── STEP 5: Queued Execution ───────────────────────────────────────────
      this.emit('log', undefined, '⚡ Step 5/7 — Executing steps…')
      this.plan.status = 'executing'
      await this.executeAllSteps()

      // Cast needed: TypeScript narrows status to 'executing' after assignment above,
      // but executeAllSteps() can mutate it to 'cancelled'
      if ((this.plan.status as string) === 'cancelled') return this.finalize()

      // ── STEP 6: Result Aggregation ─────────────────────────────────────────
      if (this.plan.status === 'executing') {
        this.emit('log', undefined, '🔗 Step 6/7 — Aggregating results…')
        const aggregated = this.aggregateResults()
        this.plan.result = aggregated
        this.plan.status = 'completed'
        this.emit('plan_complete', { plan: this.plan }, `🏁 ${steps.length} steps complete`)
      } else if (this.plan.status === 'failed') {
        this.emit('plan_failed', { plan: this.plan }, `💥 Execution failed: ${this.plan.error}`)
      }

      // ── STEP 7: Memory Update (non-blocking) ───────────────────────────────
      this.emit('log', undefined, '💾 Step 7/7 — Persisting to memory…')
      void this.persistToMemory()   // fire-and-forget, don't block SSE close

    } catch (err) {
      this.plan.status = 'failed'
      this.plan.error  = (err as Error).message
      this.emit('plan_failed', { plan: this.plan }, `💥 Pipeline error: ${this.plan.error}`)
    }

    return this.finalize()
  }

  // ── Step 2: Intent Analysis ───────────────────────────────────────────────────

  private async analyseIntent(goal: string): Promise<{
    category: string
    systems:  string[]
    urgency:  string
    outputType: string
  }> {
    try {
      const intent = await fastJSON<{
        category:   string
        systems:    string[]
        urgency:    string
        outputType: string
      }>(
        'You are an intent classifier for an AI execution system.',
        `Classify this goal: "${goal.slice(0, 200)}"

Return JSON:
{
  "category": "research|communication|automation|analysis|browser|memory|workflow|general",
  "systems": ["browser", "email", "memory", "api", "voice"],
  "urgency": "immediate|scheduled|background",
  "outputType": "report|email|data|action|notification"
}`,
        { temperature: 0.05 }
      )
      return intent ?? { category: 'general', systems: ['memory'], urgency: 'immediate', outputType: 'data' }
    } catch {
      return { category: 'general', systems: ['memory'], urgency: 'immediate', outputType: 'data' }
    }
  }

  // ── Step 3: System Routing ────────────────────────────────────────────────────

  private buildRoutingPlan(intent: { category: string; systems: string[] }): {
    primaryAgent: string
    tools: string[]
    useQueue: boolean
  } {
    const systemMap: Record<string, { agent: string; tools: string[] }> = {
      research:      { agent: 'browser',        tools: ['web_search', 'browser'] },
      communication: { agent: 'communication',  tools: ['outlook', 'email'] },
      browser:       { agent: 'browser',        tools: ['playwright', 'extract'] },
      analysis:      { agent: 'planner',        tools: ['groq', 'memory'] },
      memory:        { agent: 'memory',         tools: ['supabase'] },
      workflow:      { agent: 'planner',        tools: ['dag', 'queue'] },
    }

    const mapping = systemMap[intent.category] ?? { agent: 'planner', tools: ['groq'] }

    return {
      primaryAgent: mapping.agent,
      tools:        mapping.tools,
      useQueue:     intent.systems.includes('browser'),
    }
  }

  // ── Step 4: Execution Graph Building ─────────────────────────────────────────

  private async buildExecutionGraph(
    goal: string,
    _routing: { primaryAgent: string; tools: string[] }
  ): Promise<ExecStep[]> {
    try {
      const steps = await decomposeGoal(goal)
      if (steps.length > 0) return steps
    } catch { /* fallback below */ }

    // Minimal fallback via Planner agent
    const result = await dispatchToAgent(
      'planner', 'decompose', { goal },
      this.plan.userId,
      { planId: this.plan.id }
    )

    if (result.success && result.output) {
      const plannerOut = result.output as { steps?: ExecStep[] }
      if (plannerOut.steps && plannerOut.steps.length > 0) return plannerOut.steps
    }

    // Hard fallback
    return [
      { id: nanoid(8), index: 0, type: 'ai_process',  label: 'Process request',  tool: 'groq', input: { prompt: goal }, status: 'pending' },
      { id: nanoid(8), index: 1, type: 'memory_write', label: 'Save result',      tool: 'supabase', input: { key: 'last_result' }, status: 'pending' },
    ]
  }

  // ── Step 5: Execute all steps ─────────────────────────────────────────────────

  private async executeAllSteps(): Promise<void> {
    const agentEvent = (ev: AgentEvent) => {
      this.emit('log', { agentEvent: ev }, ev.message)
    }

    for (let i = 0; i < this.plan.steps.length; i++) {
      if (this.aborted) { this.plan.status = 'cancelled'; break }

      const step = this.plan.steps[i]!
      this.plan.currentStep = i
      step.status    = 'running'
      step.startedAt = new Date().toISOString()

      this.emit('step_start', { step, stepIndex: i }, `⚡ [${i + 1}/${this.plan.steps.length}] ${step.label}`)

      try {
        // Route email steps through Communication agent (Outlook first)
        const output = await this.routeStep(step, agentEvent)

        step.output      = output
        step.status      = 'completed'
        step.completedAt = new Date().toISOString()
        step.durationMs  = Date.now() - new Date(step.startedAt).getTime()
        this.context[i]  = output

        this.emit('step_complete', { step, stepIndex: i, output }, `✅ ${step.label}`)
      } catch (err) {
        step.status      = 'failed'
        step.error       = (err as Error).message
        step.completedAt = new Date().toISOString()
        step.durationMs  = Date.now() - new Date(step.startedAt!).getTime()

        this.emit('step_failed', { step, stepIndex: i, error: step.error }, `❌ ${step.label}: ${step.error}`)

        if (this.isCriticalStep(step)) {
          this.plan.status = 'failed'
          this.plan.error  = `Critical step "${step.label}" failed: ${step.error}`
          break
        }
        this.emit('log', undefined, `⚠️ Non-critical failure — continuing…`)
      }
    }
  }

  private async routeStep(step: ExecStep, onAgentEvent: (ev: AgentEvent) => void): Promise<unknown> {
    // Email steps → Communication Agent (Outlook primary)
    if (['email_send', 'email_read', 'email_draft'].includes(step.type)) {
      const actionMap: Record<string, string> = {
        email_send:  'send_email',
        email_read:  'list_emails',
        email_draft: 'draft_email',
      }
      const result = await dispatchToAgent(
        'communication',
        actionMap[step.type] ?? step.type,
        { ...step.input, context: JSON.stringify(Object.values(this.context).slice(-2)) },
        this.plan.userId,
        { planId: this.plan.id, stepId: step.id, onEvent: onAgentEvent }
      )
      return result.output ?? { error: result.error }
    }

    // Browser steps → Browser Agent
    // browser_open uses navigation mode (opens real tab); others use Playwright worker
    if (['browser_open', 'browser_click', 'browser_extract', 'browser_screenshot', 'browser_navigate'].includes(step.type)) {
      const browserAction = step.type === 'browser_open' ? 'open_url' : step.type
      const result = await dispatchToAgent(
        'browser', browserAction,
        { ...step.input, rawText: this.plan.rawText, goal: this.plan.goal },
        this.plan.userId,
        { planId: this.plan.id, stepId: step.id, onEvent: onAgentEvent }
      )
      return result.output ?? { error: result.error }
    }

    // All other steps → standard executor
    return executeStep(step, this.context, this.plan.userId)
  }

  // ── Step 6: Result aggregation ────────────────────────────────────────────────

  private aggregateResults(): unknown {
    const outputs   = Object.values(this.context)
    const lastOutput = outputs[outputs.length - 1]

    // Build a structured summary of all step outputs
    const completed = this.plan.steps.filter(s => s.status === 'completed')
    const failed    = this.plan.steps.filter(s => s.status === 'failed')

    return {
      primaryResult:  lastOutput,
      stepOutputs:    outputs,
      summary: {
        total:     this.plan.steps.length,
        completed: completed.length,
        failed:    failed.length,
        durationMs: Date.now() - new Date(this.plan.startedAt).getTime(),
      },
    }
  }

  // ── Step 7: Memory Update ─────────────────────────────────────────────────────

  private async persistToMemory(): Promise<void> {
    try {
      await dispatchToAgent(
        'memory', 'log_execution',
        {
          planId:     this.plan.id,
          status:     this.plan.status,
          goal:       this.plan.goal,
          durationMs: this.plan.durationMs ?? 0,
          result:     this.plan.result,
        },
        this.plan.userId,
        { planId: this.plan.id }
      )

      // Run optimization scoring (non-blocking)
      void dispatchToAgent(
        'optimization', 'score_execution',
        { plan: this.plan },
        this.plan.userId,
        { planId: this.plan.id }
      )
    } catch {
      // Non-fatal
    }
  }

  // ── Finalize & return plan ────────────────────────────────────────────────────

  private finalize(): ExecPlan {
    this.plan.completedAt = new Date().toISOString()
    this.plan.durationMs  = Date.now() - new Date(this.plan.startedAt).getTime()
    return this.plan
  }

  private isCriticalStep(step: ExecStep): boolean {
    return step.type === 'email_send' || step.type === 'http_request'
  }

  private emit(type: ExecEvent['type'], data?: unknown, message?: string): void {
    this.onEvent({
      type,
      planId:    this.plan.id,
      stepId:    (data as { step?: ExecStep })?.step?.id,
      data,
      message,
      timestamp: new Date().toISOString(),
    })
  }
}
