/**
 * GET  /api/devices          — List all paired Desktop Agents for the authenticated user
 * POST /api/devices/pair     — Auto-pair a new Desktop Agent (called by Electron on launch)
 *
 * Phase 6: Auto-Pairing Device System
 *
 * The Electron agent calls POST /api/devices/pair on first launch with:
 *   - CORE JWT in Authorization header (obtained from CORE login)
 *   - Device fingerprint, name, platform, capabilities
 * OPS validates with CORE, registers device in Supabase, responds with
 *   { paired: true, device, sessionToken }.
 *
 * No QR code required — login = instant device registration.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import { pairDevice, listDevices }   from '@/lib/devices/registry'
import type { DevicePairRequest }    from '@/types/ops'

export const dynamic = 'force-dynamic'

// ── GET — list paired devices ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const userId  = auth.supabaseUserId ?? auth.ctx.userId
  const devices = await listDevices(userId)

  return NextResponse.json({ devices, count: devices.length })
}

// ── POST — pair a new device ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await req.json() as DevicePairRequest & { action?: string }

    // Support both POST /api/devices (pair) and POST /api/devices?action=pair
    const action = body.action ?? new URL(req.url).searchParams.get('action') ?? 'pair'

    if (action !== 'pair' && action !== 'register') {
      return NextResponse.json({ error: 'Unsupported action. Use action=pair' }, { status: 400 })
    }

    if (!body.deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    if (!body.fingerprint) {
      return NextResponse.json({ error: 'fingerprint is required' }, { status: 400 })
    }

    const userId = auth.supabaseUserId ?? auth.ctx.userId

    // Extract IP address from request headers
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      undefined

    const result = await pairDevice({
      userId,
      deviceId:     body.deviceId,
      name:         body.name         ?? `${body.platform ?? 'desktop'}-agent`,
      platform:     body.platform     ?? 'windows',
      version:      body.version      ?? '1.0.0',
      capabilities: body.capabilities ?? ['browser', 'filesystem', 'notify'],
      fingerprint:  body.fingerprint,
      ipAddress,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Pairing failed' }, { status: 500 })
    }

    return NextResponse.json({
      paired:       true,
      device:       result.device,
      // In production, generate a signed device session token here
      sessionToken: Buffer.from(`${userId}:${body.deviceId}:${Date.now()}`).toString('base64'),
      message:      '✅ KENUXA Desktop Agent connected',
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
