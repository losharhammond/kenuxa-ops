/**
 * KENUXA CORE — Memory Engine API
 *
 * GET    /api/memory?action=list&type=semantic&limit=20
 * GET    /api/memory?action=search&q=:query&type=:type
 * GET    /api/memory?action=stats
 * GET    /api/memory?action=get&id=:id
 * POST   /api/memory  { action: "create", ... }
 * PATCH  /api/memory?id=:id
 * DELETE /api/memory?id=:id
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  createMemory, listMemory, searchMemory, getMemoryRecord,
  updateMemory, deleteMemory, getMemoryStats,
  memorySchema, memorySearchSchema,
} from "@/lib/memory/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const orgId  = ctx.organizationId ?? params.get("organizationId") ?? "";
  const action = params.get("action") ?? "list";

  if (!orgId) return problem("Organization context required", 400);

  if (action === "list") {
    const type    = params.get("type")    ?? undefined;
    const product = params.get("product") ?? undefined;
    const limit   = Number(params.get("limit")  ?? 20);
    const offset  = Number(params.get("offset") ?? 0);
    return ok(await listMemory(orgId, type, product, limit, offset));
  }

  if (action === "search") {
    const query = params.get("q") ?? params.get("query") ?? "";
    if (!query) return problem("Query required for search", 400);
    return ok(await searchMemory(memorySearchSchema.parse({
      organizationId: orgId,
      query,
      type:    params.get("type")    ?? undefined,
      product: params.get("product") ?? undefined,
      limit:   Number(params.get("limit") ?? 10),
    })));
  }

  if (action === "stats") {
    return ok(await getMemoryStats(orgId));
  }

  if (action === "get") {
    const id = params.get("id");
    if (!id) return problem("Memory ID required", 400);
    return ok(await getMemoryRecord(orgId, id));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const orgId = ctx.organizationId ?? (body.organizationId as string);
  if (!orgId) return problem("Organization context required", 400);

  const record = await createMemory(memorySchema.parse({ ...body, organizationId: orgId }));
  return created(record);
}

export async function PATCH(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const id   = request.nextUrl.searchParams.get("id");
  if (!id) return problem("Memory ID required", 400);

  const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
  const orgId = ctx.organizationId ?? (body.organizationId as string);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await updateMemory(orgId, id, { ...body, organizationId: orgId }));
}

export async function DELETE(request: NextRequest) {
  const ctx   = await getApiContext(request);
  const id    = request.nextUrl.searchParams.get("id");
  const orgId = ctx.organizationId;
  if (!id)    return problem("Memory ID required", 400);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await deleteMemory(orgId, id));
}
