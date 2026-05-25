/**
 * KENUXA OPS — Desktop Agent (Phase 5.2)
 *
 * Responsibilities:
 *  - Open applications via OS launcher
 *  - Switch focus between windows
 *  - Open files via default handler
 *  - Search local file system
 *  - Send local desktop notifications
 *
 * All commands dispatched through the Electron bridge WebSocket.
 * Without the bridge, returns a clear error message.
 *
 * NOTE: This agent is server-safe — it calls /api/bridge which
 * proxies through to the local bridge WebSocket.
 */
import type { AgentTask, AgentResult } from '@/types/ops'

export async function runDesktopAgent(task: AgentTask): Promise<AgentResult> {
  const start = Date.now()

  try {
    let output: unknown

    switch (task.action) {
      case 'open_app':
        output = await actionOpenApp(task)
        break

      case 'switch_window':
        output = await actionSwitchWindow(task)
        break

      case 'file_open':
        output = await actionOpenFile(task)
        break

      case 'file_search':
        output = await actionSearchFiles(task)
        break

      case 'notify':
        output = await actionNotify(task)
        break

      case 'keyboard_type':
        output = await actionKeyboardType(task)
        break

      default:
        output = {
          error: `Unknown desktop action: ${task.action}`,
          hint:  'Valid actions: open_app, switch_window, file_open, file_search, notify, keyboard_type',
        }
    }

    const err     = (output as Record<string, unknown>)?.['error']
    const success = !err

    return {
      agentType:  'browser',   // reuse browser agent slot (no 'desktop' agent type yet in Phase 4)
      taskId:     task.id,
      success,
      output,
      error:      err ? String(err) : undefined,
      durationMs: Date.now() - start,
      metadata:   { action: task.action, bridge: true },
    }
  } catch (err) {
    return {
      agentType:  'browser',
      taskId:     task.id,
      success:    false,
      error:      (err as Error).message,
      durationMs: Date.now() - start,
    }
  }
}

// ── Bridge API proxy ───────────────────────────────────────────────────────────

async function callBridge(
  command: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
  const res  = await fetch(`${base}/api/bridge`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ command, payload }),
  })
  if (!res.ok) throw new Error(`Bridge API returned ${res.status}`)
  return res.json()
}

// ── Action implementations ─────────────────────────────────────────────────────

async function actionOpenApp(task: AgentTask) {
  const app = task.payload['app'] as string
  if (!app) return { error: 'app name required for open_app' }

  try {
    const result = await callBridge('open_app', { app }) as Record<string, unknown>
    if (result['error']) return result
    return { opened: true, app }
  } catch (err) {
    return { error: (err as Error).message, app }
  }
}

async function actionSwitchWindow(task: AgentTask) {
  const title = task.payload['title'] as string
  if (!title) return { error: 'window title required for switch_window' }

  try {
    const result = await callBridge('switch_window', { title }) as Record<string, unknown>
    if (result['error']) return result
    return { switched: true, title }
  } catch (err) {
    return { error: (err as Error).message, title }
  }
}

async function actionOpenFile(task: AgentTask) {
  const path = task.payload['path'] as string
  if (!path) return { error: 'file path required for file_open' }

  try {
    const result = await callBridge('file_open', { path }) as Record<string, unknown>
    if (result['error']) return result
    return { opened: true, path }
  } catch (err) {
    return { error: (err as Error).message, path }
  }
}

async function actionSearchFiles(task: AgentTask) {
  const directory = task.payload['directory'] as string ?? 'Documents'
  const query     = task.payload['query']     as string
  const extension = task.payload['extension'] as string | undefined

  if (!query) return { error: 'search query required' }

  try {
    const result = await callBridge('file_search', { directory, query, extension }) as {
      files?: string[]
      error?: string
    }

    if (result.error) return result

    const files = result.files ?? []

    if (files.length === 0) {
      return {
        files: [],
        message: `No files matching "${query}" found in ${directory}`,
      }
    }

    if (files.length === 1) {
      return { files, single: true, path: files[0] }
    }

    return {
      files,
      multiple: true,
      message: `Found ${files.length} files matching "${query}". Which one?`,
    }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

async function actionNotify(task: AgentTask) {
  const title = task.payload['title'] as string ?? 'KENUXA OPS'
  const body  = task.payload['body']  as string ?? ''

  try {
    await callBridge('notify', { title, body })
    return { notified: true, title }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

async function actionKeyboardType(task: AgentTask) {
  const text = task.payload['text'] as string
  if (!text) return { error: 'text required for keyboard_type' }

  try {
    await callBridge('keyboard_type', { text })
    return { typed: true, length: text.length }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
