'use client'

/**
 * KENUXA OPS — useExecution hook (Phase 2)
 * Starts an execution pipeline, consumes SSE events, updates the store in real-time.
 */
import { useCallback, useRef, useState } from 'react'
import { nanoid }                        from 'nanoid'
import { useOpsStore }                   from '@/store/ops.store'
import { speak }                         from '@/services/voice/tts.service'
import type { ExecPlan, ExecEvent, ExecStep } from '@/types/ops'

export function useExecution() {
  const {
    addExecution, updateExecution, updateExecStep, setActiveExecution,
  } = useOpsStore()

  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback(async (text: string, source: 'voice' | 'api' = 'api') => {
    if (running) return

    setRunning(true)

    abortRef.current = new AbortController()
    const { signal } = abortRef.current

    // Optimistic placeholder plan
    const tempId = nanoid(12)
    const tempPlan: ExecPlan = {
      id:          tempId,
      userId:      '',
      goal:        text,
      rawText:     text,
      steps:       [],
      status:      'planning',
      currentStep: 0,
      startedAt:   new Date().toISOString(),
      source,
    }
    addExecution(tempPlan)

    let realPlanId = tempId

    try {
      const res = await fetch('/api/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, source }),
        signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (signal.aborted) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''   // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: ExecEvent = JSON.parse(line.slice(6))
            handleEvent(event)
          } catch { /* malformed SSE line */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        updateExecution(realPlanId, { status: 'failed', error: (err as Error).message })
      }
    } finally {
      setRunning(false)
    }

    // ── Event handler ──────────────────────────────────────────────────────────
    function handleEvent(event: ExecEvent) {
      switch (event.type) {
        case 'plan_created': {
          const plan = (event.data as { plan?: ExecPlan })?.plan
          if (plan) {
            realPlanId = plan.id
            addExecution(plan)
          }
          if (event.message) console.info('[exec]', event.message)
          break
        }

        case 'step_start': {
          const { step } = event.data as { step: ExecStep; stepIndex: number }
          updateExecStep(realPlanId, step.id, { status: 'running', startedAt: event.timestamp })
          updateExecution(realPlanId, { status: 'executing', currentStep: (event.data as { stepIndex: number }).stepIndex })
          break
        }

        case 'step_complete': {
          const { step } = event.data as { step: ExecStep; stepIndex: number; output: unknown }
          updateExecStep(realPlanId, step.id, {
            status:      'completed',
            output:      step.output,
            completedAt: event.timestamp,
            durationMs:  step.durationMs,
          })
          break
        }

        case 'step_failed': {
          const { step } = event.data as { step: ExecStep; error: string }
          updateExecStep(realPlanId, step.id, {
            status: 'failed',
            error:  step.error,
          })
          break
        }

        case 'plan_complete': {
          const plan = (event.data as { plan?: ExecPlan })?.plan
          if (plan) {
            updateExecution(realPlanId, {
              status:      'completed',
              result:      plan.result,
              completedAt: plan.completedAt,
              durationMs:  plan.durationMs,
            })

            // Phase 6: auto-open URLs returned by browser navigation steps
            // Browser agent returns { openUrl: 'https://...' } for tab-open commands
            const r = plan.result as Record<string, unknown> | null
            const openUrl =
              (r?.['openUrl'] as string | undefined) ??
              ((r?.['primaryResult'] as Record<string, unknown> | null)?.['openUrl'] as string | undefined) ??
              ((r?.['stepOutputs'] as Array<Record<string, unknown>> | null)
                ?.find(o => typeof o?.['openUrl'] === 'string')?.['openUrl'] as string | undefined)

            if (openUrl && typeof window !== 'undefined') {
              setTimeout(() => window.open(openUrl, '_blank', 'noopener,noreferrer'), 300)
            }
          }
          speak('Done.', 'normal')
          break
        }

        case 'plan_failed': {
          const plan = (event.data as { plan?: ExecPlan })?.plan
          updateExecution(realPlanId, {
            status: 'failed',
            error:  plan?.error ?? 'Unknown error',
          })
          speak(`Execution failed. ${plan?.error?.slice(0, 60) ?? ''}`, 'high')
          break
        }

        case 'log':
          console.info('[exec]', event.message)
          break
      }
    }
  }, [running, addExecution, updateExecution, updateExecStep])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setRunning(false)
  }, [])

  return { start, abort, running }
}
