/**
 * KENUXA CORE — Organizations API
 *
 * GET    /api/organizations                               — list orgs for current user
 * GET    /api/organizations?action=get&id=:orgId          — get org detail
 * GET    /api/organizations?action=members&id=:orgId      — list members
 * POST   /api/organizations  { action: "create", ... }   — create org
 * POST   /api/organizations  { action: "invite", ... }   — invite member
 * PATCH  /api/organizations?id=:orgId                    — update org
 * PATCH  /api/organizations?action=role                  — update member role
 * DELETE /api/organizations?action=member&orgId=:id&userId=:uid — remove member
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  createOrganization,
  listOrganizations,
  getOrganization,
  updateOrganization,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  organizationSchema,
  organizationUpdateSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "@/lib/organizations/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "list";

  if (action === "list") {
    return ok(await listOrganizations(ctx.userId));
  }

  if (action === "get") {
    const id = params.get("id");
    if (!id) return problem("Organization ID required", 400);
    return ok(await getOrganization(id));
  }

  if (action === "members") {
    const id = params.get("id");
    if (!id) return problem("Organization ID required", 400);
    return ok(await listMembers(id));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;

  if (action === "create" || !action) {
    const org = await createOrganization(ctx.userId, organizationSchema.parse(rest));
    return created(org);
  }

  if (action === "invite") {
    const orgId = ctx.organizationId ?? (rest.organizationId as string);
    if (!orgId) return problem("Organization context required", 400);
    const result = await inviteMember(
      ctx.userId,
      inviteMemberSchema.parse({ ...rest, organizationId: orgId }),
    );
    return created(result);
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function PATCH(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "update";
  const body   = await request.json().catch(() => ({})) as Record<string, unknown>;

  if (action === "update") {
    const id = params.get("id") ?? (body.id as string);
    if (!id) return problem("Organization ID required", 400);
    return ok(await updateOrganization(id, organizationUpdateSchema.parse(body)));
  }

  if (action === "role") {
    const orgId = ctx.organizationId ?? (body.organizationId as string);
    if (!orgId) return problem("Organization context required", 400);
    return ok(await updateMemberRole(updateMemberRoleSchema.parse({ ...body, organizationId: orgId })));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function DELETE(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "member";

  if (action === "member") {
    const orgId  = params.get("orgId")  ?? ctx.organizationId;
    const userId = params.get("userId") ?? ctx.userId;
    if (!orgId)  return problem("Organization ID required", 400);
    if (!userId) return problem("User ID required", 400);
    return ok(await removeMember(orgId, userId));
  }

  return problem(`Unknown action: ${action}`, 400);
}
