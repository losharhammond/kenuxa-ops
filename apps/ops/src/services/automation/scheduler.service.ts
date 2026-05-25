/**
 * KENUXA OPS — Scheduler Service
 * Cron-based workflow scheduling (server-side singleton)
 */
import cron from 'node-cron'

type ScheduledTask = {
  id:   string
  name: string
  task: cron.ScheduledTask
}

const scheduledTasks = new Map<string, ScheduledTask>()

export function scheduleWorkflow(
  workflowId: string,
  name:       string,
  expression: string,
  handler:    () => Promise<void>
): boolean {
  if (!cron.validate(expression)) {
    console.error(`[scheduler] Invalid cron expression: ${expression}`)
    return false
  }

  // Remove existing if any
  unscheduleWorkflow(workflowId)

  const task = cron.schedule(expression, async () => {
    console.log(`[scheduler] Running workflow: ${name} (${workflowId})`)
    try {
      await handler()
    } catch (err) {
      console.error(`[scheduler] Workflow ${name} failed:`, err)
    }
  })

  scheduledTasks.set(workflowId, { id: workflowId, name, task })
  console.log(`[scheduler] Scheduled "${name}" with expression: ${expression}`)
  return true
}

export function unscheduleWorkflow(workflowId: string): void {
  const scheduled = scheduledTasks.get(workflowId)
  if (scheduled) {
    scheduled.task.stop()
    scheduledTasks.delete(workflowId)
    console.log(`[scheduler] Unscheduled: ${scheduled.name}`)
  }
}

export function getScheduledWorkflows(): Array<{ id: string; name: string }> {
  return Array.from(scheduledTasks.values()).map(t => ({ id: t.id, name: t.name }))
}

export function stopAll(): void {
  for (const [id, task] of scheduledTasks) {
    task.task.stop()
    scheduledTasks.delete(id)
  }
}

/** Schedule a one-time task at a specific time */
export function scheduleOnce(
  id:      string,
  name:    string,
  runAt:   Date,
  handler: () => Promise<void>
): void {
  const now  = new Date()
  const diff = runAt.getTime() - now.getTime()
  if (diff <= 0) {
    console.warn(`[scheduler] Scheduled time is in the past: ${name}`)
    return
  }

  const timeout = setTimeout(async () => {
    scheduledTasks.delete(id)
    try {
      await handler()
    } catch (err) {
      console.error(`[scheduler] One-time task ${name} failed:`, err)
    }
  }, diff)

  // Create a fake ScheduledTask wrapper
  const fakeTask = {
    stop: () => clearTimeout(timeout),
  } as unknown as cron.ScheduledTask

  scheduledTasks.set(id, { id, name, task: fakeTask })
  console.log(`[scheduler] One-time task "${name}" scheduled for ${runAt.toISOString()}`)
}
