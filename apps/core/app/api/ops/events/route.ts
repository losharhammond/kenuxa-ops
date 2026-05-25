/**
 * KENUXA OPS — Event Bridge
 *
 * POST /api/ops/events  — publish event from OPS
 * GET  /api/ops/events  — list recent events for org
 */

import { NextRequest } from "next/server";
import { ok, created, problem } from "@/lib/api";
import { publishEvent, listEvents, eventSchema } from "@/lib/events/service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orgId  = params.get("orgId");
  const status = params.get("status") ?? undefined;
  const limit  = Number(params.get("limit") ?? 50);

  if (!orgId) return problem("orgId required", 400);
  return ok(await listEvents(orgId, status, limit));
}

export async function POST(request: NextRequest) {
  const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
  const event = await publishEvent(eventSchema.parse({
    event:          body.event ?? "ops.command",
    source:         body.source ?? "ops",
    organizationId: body.organizationId,
    payload:        body.payload ?? {},
    idempotencyKey: body.idempotencyKey,
  }));
  return created(event);
}
