/**
 * KENUXA CORE — Integrations API
 *
 * GET    /api/integrations              — list all integrations for org
 * POST   /api/integrations              — create / connect an integration
 * PATCH  /api/integrations?id=:id       — update integration config
 * DELETE /api/integrations?id=:id       — remove integration
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  createIntegration, listIntegrations, updateIntegration, deleteIntegration,
  integrationSchema, integrationUpdateSchema,
} from "@/lib/integrations/service";

export async function GET(request: NextRequest) {
  const ctx   = await getApiContext(request);
  const orgId = ctx.organizationId;
  if (!orgId) return problem("Organization context required", 400);
  return ok(await listIntegrations(orgId));
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const orgId = ctx.organizationId ?? (body.organizationId as string);
  if (!orgId) return problem("Organization context required", 400);

  const integration = await createIntegration(
    ctx.userId,
    integrationSchema.parse({ ...body, organizationId: orgId }),
  );
  return created(integration);
}

export async function PATCH(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const id   = request.nextUrl.searchParams.get("id");
  if (!id) return problem("Integration ID required", 400);

  const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
  const orgId = ctx.organizationId ?? (body.organizationId as string);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await updateIntegration(id, integrationUpdateSchema.parse({ ...body, organizationId: orgId })));
}

export async function DELETE(request: NextRequest) {
  const ctx   = await getApiContext(request);
  const id    = request.nextUrl.searchParams.get("id");
  const orgId = ctx.organizationId;
  if (!id)    return problem("Integration ID required", 400);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await deleteIntegration(orgId, id));
}

