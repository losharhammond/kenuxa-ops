/**
 * KENUXA Desktop Agent — Device Registry
 *
 * Handles:
 *  - Pairing with KENUXA OPS (POST /api/devices)
 *  - 30-second heartbeat (POST /api/devices/[id])
 *  - Generating a stable device fingerprint
 */

import * as os   from 'os'
import * as fs   from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { app }   from 'electron'

const OPS_URL     = process.env['OPS_URL'] ?? 'http://localhost:3002'
const ID_FILE     = path.join(app.getPath('userData'), 'device.id')
const HEARTBEAT_MS = 30_000   // 30 seconds

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

// ── Device fingerprint ─────────────────────────────────────────────────────────

export function getDeviceId(): string {
  if (fs.existsSync(ID_FILE)) {
    return fs.readFileSync(ID_FILE, 'utf8').trim()
  }

  // Stable fingerprint from hardware info
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model ?? 'unknown',
    os.totalmem().toString(),
  ].join('|')

  const id = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
  fs.mkdirSync(path.dirname(ID_FILE), { recursive: true })
  fs.writeFileSync(ID_FILE, id, 'utf8')
  return id
}

export function getDeviceFingerprint(): string {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model ?? 'unknown',
    os.totalmem().toString(),
    os.networkInterfaces(),
  ].join('|')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function getDeviceName(): string {
  return `${os.hostname()} (${os.platform()})`
}

// ── Register device with OPS ───────────────────────────────────────────────────

export async function registerDevice(opts: {
  accessToken: string
  userId:      string
  platform:    'windows' | 'macos' | 'linux'
  version:     string
}): Promise<{ success: boolean; deviceId?: string; error?: string }> {
  const deviceId    = getDeviceId()
  const fingerprint = getDeviceFingerprint()

  try {
    const res = await fetch(`${OPS_URL}/api/devices`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${opts.accessToken}`,
      },
      body: JSON.stringify({
        deviceId,
        fingerprint,
        name:         getDeviceName(),
        platform:     opts.platform,
        version:      opts.version,
        capabilities: detectCapabilities(),
      }),
    })

    if (!res.ok) {
      const body = await res.json() as { error?: string }
      return { success: false, error: body.error ?? `HTTP ${res.status}` }
    }

    const body = await res.json() as { paired?: boolean; error?: string }
    if (!body.paired) {
      return { success: false, error: body.error ?? 'Not paired' }
    }

    console.info(`[registry] Device "${getDeviceName()}" paired as ${deviceId}`)
    return { success: true, deviceId }
  } catch (err) {
    console.warn('[registry] Registration error:', (err as Error).message)
    return { success: false, deviceId, error: (err as Error).message }
  }
}

// ── Heartbeat ──────────────────────────────────────────────────────────────────

export function startHeartbeat(opts: { accessToken: string; deviceId: string }) {
  stopHeartbeat()

  const beat = async () => {
    try {
      await fetch(`${OPS_URL}/api/devices/${opts.deviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${opts.accessToken}`,
        },
        body: JSON.stringify({ action: 'heartbeat' }),
      })
    } catch {
      // Non-fatal — OPS will mark device offline after 90s
    }
  }

  // Send immediately, then every 30s
  beat()
  heartbeatTimer = setInterval(beat, HEARTBEAT_MS)
  console.info('[registry] Heartbeat started')
}

export function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
    console.info('[registry] Heartbeat stopped')
  }
}

// ── Capability detection ───────────────────────────────────────────────────────

function detectCapabilities(): string[] {
  const caps: string[] = ['browser', 'filesystem', 'notify']
  // Could add 'voice', 'playwright' if those services are installed
  return caps
}
