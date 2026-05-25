/**
 * GET  /api/bridge — Desktop bridge connection status
 * POST /api/bridge — Dispatch command to desktop bridge
 *
 * Phase 5.2: Server-side proxy for the local Electron bridge.
 * The bridge runs at ws://localhost:7411 on the user's machine.
 *
 * Because WebSockets can't be made from Vercel serverless functions,
 * this route uses HTTP to probe/call the Electron bridge's REST companion
 * (the bridge exposes both WS and HTTP on port 7411).
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'

export const dynamic     = 'force-dynamic'
export const maxDuration = 15

const BRIDGE_HTTP_URL = process.env.DESKTOP_BRIDGE_URL ?? 'http://localhost:7411'
const BRIDGE_SECRET   = process.env.DESKTOP_BRIDGE_SECRET ?? ''

// ── GET — bridge status ────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  // Public endpoint — no auth required (just probes localhost)
  try {
    const res = await fetch(`${BRIDGE_HTTP_URL}/status`, {
      signal: AbortSignal.timeout(2000),
      headers: BRIDGE_SECRET
        ? { 'X-Bridge-Secret': BRIDGE_SECRET }
        : {},
    })

    if (!res.ok) {
      return NextResponse.json({ connected: false, error: `Bridge returned ${res.status}` })
    }

    const data = await res.json() as {
      version?:      string
      platform?:     string
      capabilities?: string[]
    }

    return NextResponse.json({
      connected:    true,
      version:      data.version,
      platform:     data.platform,
      capabilities: data.capabilities ?? ['open_app', 'switch_window', 'file_open', 'file_search', 'notify', 'keyboard_type'],
    })
  } catch {
    return NextResponse.json({
      connected: false,
      hint:      'Desktop bridge agent not running. Start the KENUXA Electron bridge to enable desktop/file commands.',
    })
  }
}

// ── POST — dispatch command ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      command: string
      payload: Record<string, unknown>
    }

    if (!body.command) {
      return NextResponse.json({ error: 'command is required' }, { status: 400 })
    }

    // Probe bridge first
    let bridgeAvailable = false
    try {
      const probe = await fetch(`${BRIDGE_HTTP_URL}/status`, {
        signal: AbortSignal.timeout(1500),
        headers: BRIDGE_SECRET ? { 'X-Bridge-Secret': BRIDGE_SECRET } : {},
      })
      bridgeAvailable = probe.ok
    } catch {
      bridgeAvailable = false
    }

    if (!bridgeAvailable) {
      return NextResponse.json({
        success: false,
        error:   'Desktop bridge agent not connected.',
        hint:    'Start the KENUXA Electron desktop bridge application on your computer.',
      }, { status: 503 })
    }

    // Dispatch to bridge
    const res = await fetch(`${BRIDGE_HTTP_URL}/execute`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BRIDGE_SECRET ? { 'X-Bridge-Secret': BRIDGE_SECRET } : {}),
      },
      body:   JSON.stringify({
        command: body.command,
        payload: body.payload,
        userId:  auth.supabaseUserId ?? auth.ctx.userId,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      return NextResponse.json({
        success: false,
        error:   `Bridge command failed: ${errText.slice(0, 200)}`,
      }, { status: 502 })
    }

    const result = await res.json()
    return NextResponse.json({ success: true, result })

  } catch (err) {
    return NextResponse.json({
      success: false,
      error:   (err as Error).message,
    }, { status: 500 })
  }
}
