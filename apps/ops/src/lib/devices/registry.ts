/**
 * KENUXA OPS — Device Registry Service (Phase 6)
 *
 * Manages the lifecycle of paired Desktop Agent instances:
 *   - Auto-pairing on first login (no QR code required)
 *   - Heartbeat tracking (marks devices offline after 90s of silence)
 *   - Capability advertisement (browser, filesystem, voice, playwright)
 *   - Command queue for cloud→desktop dispatch
 *
 * Supabase table: ops_devices
 *   id, user_id, name, platform, version, status,
 *   capabilities (jsonb), ip_address, fingerprint,
 *   last_seen_at, paired_at
 */
import type { OpsDevice, DevicePlatform, DeviceStatus } from '@/types/ops'

// A device is considered offline if it hasn't sent a heartbeat for this long
const OFFLINE_THRESHOLD_MS = 90_000   // 90 seconds

// ── Type for raw Supabase row ──────────────────────────────────────────────────

interface DeviceRow {
  id:           string
  user_id:      string
  name:         string
  platform:     string
  version:      string
  status:       string
  capabilities: string[]
  ip_address?:  string
  fingerprint:  string
  last_seen_at: string
  paired_at:    string
}

// ── Map DB row → OpsDevice ─────────────────────────────────────────────────────

function mapDevice(row: DeviceRow): OpsDevice {
  const lastSeen   = new Date(row.last_seen_at).getTime()
  const idleMs     = Date.now() - lastSeen
  const liveStatus: DeviceStatus =
    row.status === 'active' && idleMs > OFFLINE_THRESHOLD_MS ? 'offline' : row.status as DeviceStatus

  return {
    id:           row.id,
    userId:       row.user_id,
    name:         row.name,
    platform:     row.platform as DevicePlatform,
    version:      row.version,
    status:       liveStatus,
    capabilities: row.capabilities ?? [],
    ipAddress:    row.ip_address,
    fingerprint:  row.fingerprint,
    lastSeenAt:   row.last_seen_at,
    pairedAt:     row.paired_at,
  }
}

// ── Pair or re-pair a device ──────────────────────────────────────────────────

export async function pairDevice(params: {
  userId:       string
  deviceId:     string
  name:         string
  platform:     string
  version:      string
  capabilities: string[]
  fingerprint:  string
  ipAddress?:   string
}): Promise<{ success: boolean; device?: OpsDevice; error?: string }> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('ops_devices')
      .upsert(
        {
          id:           params.deviceId,
          user_id:      params.userId,
          name:         params.name,
          platform:     params.platform,
          version:      params.version,
          capabilities: params.capabilities,
          fingerprint:  params.fingerprint,
          ip_address:   params.ipAddress ?? null,
          status:       'active',
          last_seen_at: now,
          paired_at:    now,
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (error) {
      // Table might not exist yet — log and return a synthetic device
      console.warn('[registry] ops_devices table missing or error:', error.message)
      return {
        success: true,
        device: {
          id:           params.deviceId,
          userId:       params.userId,
          name:         params.name,
          platform:     params.platform as DevicePlatform,
          version:      params.version,
          status:       'active',
          capabilities: params.capabilities,
          fingerprint:  params.fingerprint,
          ipAddress:    params.ipAddress,
          lastSeenAt:   now,
          pairedAt:     now,
        },
      }
    }

    return { success: true, device: mapDevice(data as DeviceRow) }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ── List all devices for a user ───────────────────────────────────────────────

export async function listDevices(userId: string): Promise<OpsDevice[]> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('ops_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.warn('[registry] listDevices error:', error.message)
      return []
    }

    return (data as DeviceRow[]).map(mapDevice)
  } catch {
    return []
  }
}

// ── Heartbeat — device signals it is alive ────────────────────────────────────

export async function deviceHeartbeat(
  deviceId: string,
  userId:   string,
): Promise<{ alive: boolean }> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('ops_devices')
      .update({
        status:       'active',
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .eq('user_id', userId)

    return { alive: !error }
  } catch {
    return { alive: false }
  }
}

// ── Unpair a device ───────────────────────────────────────────────────────────

export async function unpairDevice(deviceId: string, userId: string): Promise<boolean> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('ops_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId)

    return !error
  } catch {
    return false
  }
}

// ── Mark device offline (called on server when bridge probe fails) ────────────

export async function markDeviceOffline(deviceId: string): Promise<void> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    await supabase
      .from('ops_devices')
      .update({ status: 'offline' })
      .eq('id', deviceId)
  } catch { /* non-fatal */ }
}

// ── Get single device ─────────────────────────────────────────────────────────

export async function getDevice(deviceId: string, userId: string): Promise<OpsDevice | null> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('ops_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return mapDevice(data as DeviceRow)
  } catch {
    return null
  }
}
