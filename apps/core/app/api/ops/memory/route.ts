/**
 * KENUXA OPS — Memory Bridge
 *
 * GET  /api/ops/memory?orgId=:id&q=:query  — search memory for OPS context assembly
 * POST /api/ops/memory                      — store new memory from OPS
 */

import { NextRequest } from "next/server";
import { ok, created, problem } from "@/lib/api";
import { searchMemory, createMemory, memorySchema, memorySearchSchema } from "@/lib/memory/service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orgId  = params.get("orgId");
  const query  = params.get("q") ?? params.get("query");

  if (!orgId)  return problem("orgId required", 400);
  if (!query)  return problem("query required", 400);

  const results = await searchMemory(memorySearchSchema.parse({
    organizationId: orgId,
    query,
    type:    params.get("type") ?? undefined,
    product: params.get("product") ?? undefined,
    limit:   Number(params.get("limit") ?? 10),
  }));

  return ok(results);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const record = await createMemory(memorySchema.parse({
    ...body,
    organizationId: body.organizationId,
    source:         body.source ?? "ops",
  }));

  return created(record);
}
