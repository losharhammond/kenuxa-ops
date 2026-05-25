/**
 * notify — show a native OS notification.
 * Uses Electron's Notification API — works on Windows, macOS, Linux.
 *
 * Payload: { title: string, body: string }
 */

import { Notification } from 'electron'

type Payload = Record<string, unknown>

export function handleNotify(payload: Payload): object {
  const title = String(payload['title'] ?? 'KENUXA').slice(0, 100)
  const body  = String(payload['body']  ?? '').slice(0, 500)

  if (!Notification.isSupported()) {
    return { shown: false, reason: 'Notifications not supported on this system' }
  }

  const notification = new Notification({
    title,
    body,
    silent: false,
  })

  notification.show()
  return { shown: true, title, body }
}
