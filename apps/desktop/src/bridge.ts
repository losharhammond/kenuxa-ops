/**
 * KENUXA Desktop Agent — WebSocket Bridge Server
 *
 * Listens on ws://localhost:7411
 * The OPS web app's bridge.client.ts connects here.
 *
 * Message format (both directions):
 *   { id: string, type: string, payload: object }
 *
 * Response format:
 *   { id: string, type: string, success: boolean, payload?: any, error?: string }
 */

import { WebSocketServer, WebSocket } from 'ws'
import { routeCommand }               from './commands/index'

let wss: WebSocketServer | null = null

export async function startBridgeServer(port: number): Promise<void> {
  if (wss) return  // Already running

  return new Promise((resolve, reject) => {
    wss = new WebSocketServer({ host: '127.0.0.1', port })

    wss.on('listening', () => {
      console.info(`[bridge] WebSocket server listening on ws://localhost:${port}`)
      resolve()
    })

    wss.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[bridge] Port ${port} already in use — bridge may already be running`)
        resolve()  // Non-fatal; another instance might be running
      } else {
        reject(err)
      }
    })

    wss.on('connection', (ws: WebSocket) => {
      console.info('[bridge] OPS web app connected')

      ws.on('message', async (raw: Buffer) => {
        let msg: { id?: string; type: string; payload: Record<string, unknown> }

        try {
          msg = JSON.parse(raw.toString()) as typeof msg
        } catch {
          return  // Ignore malformed messages
        }

        const { id, type, payload } = msg

        try {
          const result = await routeCommand(type, payload)
          const response = JSON.stringify({
            id,
            type,
            success: true,
            payload: result,
          })
          ws.send(response)
        } catch (err) {
          const response = JSON.stringify({
            id,
            type,
            success: false,
            error: (err as Error).message,
          })
          ws.send(response)
        }
      })

      ws.on('close',   () => console.info('[bridge] OPS web app disconnected'))
      ws.on('error',   (err) => console.warn('[bridge] WebSocket error:', err.message))
    })
  })
}

export function stopBridgeServer(): void {
  if (wss) {
    wss.close()
    wss = null
    console.info('[bridge] WebSocket server stopped')
  }
}
