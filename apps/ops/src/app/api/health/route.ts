/**
 * GET /api/health — System health check
 *
 * Phase 3: Probes all system dependencies and returns unified status.
 * Results are cached in Redis for 5 minutes.
 *
 * Public endpoint (no auth required) for uptime monitoring.
 * ?refresh=true forces cache invalidation.
 */
import { NextRequest, NextResponse } from 'next/server'
import { runHealthCheck }            from '@/services/queue/health.service'

export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true'

  try {
    const health = await runHealthCheck(forceRefresh)

    // HTTP status reflects overall health
    const httpStatus =
      health.overall === 'online'   ? 200 :
      health.overall === 'degraded' ? 207 :
      503

    return NextResponse.json(health, { status: httpStatus })
  } catch (err) {
    return NextResponse.json(
      {
        overall:   'offline',
        services:  [],
        checkedAt: new Date().toISOString(),
        error:     (err as Error).message,
      },
      { status: 503 }
    )
  }
}
