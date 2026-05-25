/**
 * KENUXA CORE — Event Bus API
 *
 * GET    /api/events?action=list&status=queued
 * GET    /api/events?action=stats
 * GET    /api/events?action=subscriptions
 * POST   /api/events  { action: "publish", event: "...", ... }
 * POST   /api/events  { action: "subscribe", eventPattern: "...", ... }
 * DELETE /api/events?action=unsubscribe&id=:subId
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  publishEvent, listEvents, getEventStats,
  createSubscription, listSubscriptions, deleteSubscription,
  eventSchema, subscriptionSchema,
} from "@/lib/events/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "list";
  const orgId  = ctx.organizationId;

  if (!orgId) return problem("Organization context required", 400);

  if (action === "list") {
    const status = params.get("status") ?? undefined;
    const limit  = Number(params.get("limit") ?? 100);
    return ok(await listEvents(orgId, status, limit));
  }

  if (action === "stats") {
    const days = Number(params.get("days") ?? 1);
    return ok(await getEventStats(orgId, days));
  }

  if (action === "subscriptions") {
    return ok(await listSubscriptions(orgId));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;
  const orgId = ctx.organizationId ?? (rest.organizationId as string);

  if (!orgId) return problem("Organization context required", 400);

  if (action === "publish" || !action) {
    const event = await publishEvent(eventSchema.parse({ ...rest, organizationId: orgId }));
    return created(event);
  }

  if (action === "subscribe") {
    const sub = await createSubscription(subscriptionSchema.parse({ ...rest, organizationId: orgId }));
    return created(sub);
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function DELETE(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const id     = params.get("id");
  const orgId  = ctx.organizationId;

  if (!id)    return problem("Subscription ID required", 400);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await deleteSubscription(orgId, id));
}
