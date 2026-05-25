/**
 * KENUXA CORE — Analytics API
 *
 * GET /api/analytics?action=health
 * GET /api/analytics?action=ai&days=7
 * GET /api/analytics?action=events&days=1
 * GET /api/analytics?action=usage&metric=ai_requests&days=30
 */

import { NextRequest } from "next/server";
import { ok, problem, getApiContext } from "@/lib/api";
import { getSystemHealth, getAiUsageStats, getEventStats, getUsageMetrics } from "@/lib/analytics/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "health";
  const orgId  = ctx.organizationId;
  const days   = Number(params.get("days") ?? 1);

  if (action === "health") {
    return ok(await getSystemHealth());
  }

  if (action === "ai") {
    return ok(await getAiUsageStats(orgId, days));
  }

  if (action === "events") {
    return ok(await getEventStats(orgId, days));
  }

  if (action === "usage") {
    if (!orgId) return problem("Organization context required", 400);
    const metric = params.get("metric") ?? undefined;
    return ok(await getUsageMetrics(orgId, metric, days));
  }

  return problem(`Unknown action: ${action}`, 400);
}
