/**
 * GET    /api/devices/[deviceId]            — Get single device status
 * POST   /api/devices/[deviceId]/heartbeat  — Device heartbeat (keeps device ACTIVE)
 * DELETE /api/devices/[deviceId]            — Unpair device
 *
 * The Electron agent sends a heartbeat every 30 seconds.
 * OPS marks devices OFFLINE after 90s with no heartbeat.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import {
  getDevice, deviceHeartbeat, unpairDevice,
} from '@/lib/devices/registry'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ deviceId: string }>
}

// ── GET — device status ────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { deviceId } = await params
  const userId       = auth.supabaseUserId ?? auth.ctx.userId

  const device = await getDevice(deviceId, userId)
  if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 })

  return NextResponse.json({ device })
}

// ── POST — heartbeat or other sub-actions ─────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { deviceId } = await params
  const userId       = auth.supabaseUserId ?? auth.ctx.userId

  // Support both /api/devices/[id] with body.action = 'heartbeat'
  // AND /api/devices/[id]/heartbeat (via Next.js route segment)
  let action = 'heartbeat'
  try {
    const body = await req.json() as { action?: string }
    action = body.action ?? 'heartbeat'
  } catch { /* body may be empty */ }

  if (action === 'heartbeat') {
    const result = await deviceHeartbeat(deviceId, userId)
    return NextResponse.json({
      alive:      result.alive,
      deviceId,
      checkedAt:  new Date().toISOString(),
      // Future: return pending commands for the device to execute
      pendingCommands: [],
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}

// ── DELETE — unpair device ─────────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await resolveAuth(req)
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { deviceId } = await params
  const userId       = auth.supabaseUserId ?? auth.ctx.userId

  const ok = await unpairDevice(deviceId, userId)
  if (!ok) return NextResponse.json({ error: 'Failed to unpair device' }, { status: 500 })

  return NextResponse.json({ unpaired: true, deviceId })
}
