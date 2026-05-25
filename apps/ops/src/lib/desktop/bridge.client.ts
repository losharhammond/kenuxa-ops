/**
 * KENUXA OPS — Desktop Bridge Client (Phase 5.2)
 *
 * Connects to the local Electron bridge agent via WebSocket.
 * The Electron bridge exposes desktop/file/app control via:
 *   - RobotJS / Nut.js for keyboard + mouse
 *   - Node.js child_process for app launching
 *   - Node.js fs for file system operations
 *
 * Bridge runs locally at ws://localhost:7411
 *
 * WITHOUT the bridge: all desktop/file commands return a clear
 * "Desktop bridge agent not connected." message.
 *
 * IMPORTANT: This module is client-side only (browser WebSocket).
 * Import ONLY in React components / hooks, never in API routes.
 */

const BRIDGE_URL    = 'ws://localhost:7411'
const CONNECT_TIMEOUT_MS = 3000
const MAX_RETRIES   = 3

export type BridgeEventCallback = (event: {
  type:    string
  payload: unknown
}) => void

class DesktopBridgeClient {
  private ws:         WebSocket | null = null
  private connected   = false
  private connecting  = false
  private retryCount  = 0
  private pending     = new Map<string, {
    resolve: (v: unknown) => void
    reject:  (e: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()
  private eventListeners: BridgeEventCallback[] = []

  get isConnected(): boolean { return this.connected }

  // ── Connection ─────────────────────────────────────────────────────────────

  async connect(): Promise<boolean> {
    if (this.connected || this.connecting) return this.connected
    if (typeof window === 'undefined') return false

    this.connecting = true

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(BRIDGE_URL)

        const timeout = setTimeout(() => {
          this.ws?.close()
          this.connecting = false
          this.connected  = false
          resolve(false)
        }, CONNECT_TIMEOUT_MS)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.connected  = true
          this.connecting = false
          this.retryCount = 0
          console.info('[bridge] Desktop bridge connected')
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as {
              id?:     string
              type:    string
              payload: unknown
              success?: boolean
              error?:   string
            }

            // Resolve pending command promise
            if (msg.id && this.pending.has(msg.id)) {
              const pending = this.pending.get(msg.id)!
              clearTimeout(pending.timeout)
              this.pending.delete(msg.id)
              if (msg.success === false) {
                pending.reject(new Error(msg.error ?? 'Bridge command failed'))
              } else {
                pending.resolve(msg.payload)
              }
              return
            }

            // Broadcast event to listeners
            this.eventListeners.forEach(cb => cb({ type: msg.type, payload: msg.payload }))
          } catch {
            // ignore malformed messages
          }
        }

        this.ws.onerror = () => {
          clearTimeout(timeout)
          this.connecting = false
          this.connected  = false
          resolve(false)
        }

        this.ws.onclose = () => {
          this.connected  = false
          this.connecting = false
          // Reject all pending commands
          for (const [, pending] of this.pending) {
            clearTimeout(pending.timeout)
            pending.reject(new Error('Bridge disconnected'))
          }
          this.pending.clear()
        }
      } catch {
        this.connecting = false
        resolve(false)
      }
    })
  }

  disconnect(): void {
    this.ws?.close()
    this.ws       = null
    this.connected  = false
    this.connecting = false
  }

  // ── Command dispatch ───────────────────────────────────────────────────────

  async send<T = unknown>(
    type:    string,
    payload: Record<string, unknown>,
    timeoutMs = 10_000
  ): Promise<T> {
    if (!this.connected) {
      throw new Error('Desktop bridge agent not connected.')
    }

    const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const msg = JSON.stringify({ id, type, payload })

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Bridge command "${type}" timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
      })

      try {
        this.ws!.send(msg)
      } catch (err) {
        clearTimeout(timeout)
        this.pending.delete(id)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  // ── Event subscription ─────────────────────────────────────────────────────

  on(callback: BridgeEventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      this.eventListeners = this.eventListeners.filter(cb => cb !== callback)
    }
  }
}

// ── Singleton instance ─────────────────────────────────────────────────────────

const bridge = typeof window !== 'undefined' ? new DesktopBridgeClient() : null

export function getBridge(): DesktopBridgeClient | null { return bridge }

export function isBridgeConnected(): boolean {
  return bridge?.isConnected ?? false
}

/** Try to connect bridge — returns true if successful */
export async function ensureBridgeConnected(): Promise<boolean> {
  if (!bridge) return false
  if (bridge.isConnected) return true
  return bridge.connect()
}

/** Send a command to the desktop bridge */
export async function sendBridgeCommand<T = unknown>(
  type:    string,
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    const ok = await ensureBridgeConnected()
    if (!ok) {
      return { success: false, error: 'Desktop bridge agent not connected.' }
    }
    const result = await bridge!.send<T>(type, payload)
    return { success: true, result }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ── Typed desktop commands ─────────────────────────────────────────────────────

export const desktopCommands = {
  openApp:      (appName: string) =>
    sendBridgeCommand('open_app', { app: appName }),

  switchWindow: (title: string) =>
    sendBridgeCommand('switch_window', { title }),

  openFile:     (path: string) =>
    sendBridgeCommand('file_open', { path }),

  searchFiles:  (directory: string, query: string, extension?: string) =>
    sendBridgeCommand<{ files: string[] }>('file_search', { directory, query, extension }),

  notify:       (title: string, body: string) =>
    sendBridgeCommand('notify', { title, body }),

  typeText:     (text: string) =>
    sendBridgeCommand('keyboard_type', { text }),

  /** Phase 6: Open a URL in the user's actual browser (new tab) */
  openUrl:      (url: string) =>
    sendBridgeCommand('open_url', { url }),

  /** Phase 6: Navigate an existing browser tab to a URL */
  browserNavigate: (url: string, query?: string) =>
    sendBridgeCommand('browser_navigate', { url, query }),

  getBridgeInfo: () =>
    sendBridgeCommand<{ platform: string; version: string; capabilities: string[] }>('info', {}),
}
