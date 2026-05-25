/**
 * KENUXA CORE — API Key Management Route
 *
 * GET  /api/keys          — list all keys for the caller's org
 * POST /api/keys          — create a new scoped API key
 * DELETE /api/keys?id=:id — revoke a key
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, problem, getApiContext } from "@/lib/api";
import { createApiKey, listApiKeys, revokeApiKey, createKeySchema } from "@/lib/keys/service";

export async function GET(request: NextRequest) {
  const ctx = await getApiContext(request);
  if (!ctx.organizationId) return problem("Organization context required", 400);
  const keys = await listApiKeys(ctx.organizationId);
  return ok(keys);
}

export async function POST(request: NextRequest) {
  const ctx = await getApiContext(request);
  if (!ctx.organizationId) return problem("Organization context required", 400);

  const body = await request.json().catch(() => ({})) as z.input<typeof createKeySchema>;
  const key  = await createApiKey(ctx.userId, { ...body, organizationId: ctx.organizationId });
  return created(key);
}

export async function DELETE(request: NextRequest) {
  const ctx   = await getApiContext(request);
  const keyId = request.nextUrl.searchParams.get("id");
  if (!keyId)                return problem("Key ID required", 400);
  if (!ctx.organizationId)   return problem("Organization context required", 400);

  const result = await revokeApiKey(ctx.organizationId, keyId);
  return ok(result);
}
