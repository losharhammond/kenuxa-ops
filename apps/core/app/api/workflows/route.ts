/**
 * KENUXA CORE — Workflows API
 *
 * GET    /api/workflows?enabled=true      — list workflows
 * GET    /api/workflows?runs=true&id=:id  — list runs for a workflow
 * POST   /api/workflows  { action: "create", ... }
 * POST   /api/workflows  { action: "run", workflowId: ":id" }
 * PATCH  /api/workflows?id=:id            — update workflow
 * DELETE /api/workflows?id=:id            — delete workflow
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  createWorkflow, listWorkflows, updateWorkflow, deleteWorkflow,
  runWorkflow, listWorkflowRuns, workflowSchema, workflowRunSchema,
} from "@/lib/workflows/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const orgId  = ctx.organizationId;

  if (!orgId) return problem("Organization context required", 400);

  if (params.get("runs") === "true") {
    const workflowId = params.get("id") ?? undefined;
    return ok(await listWorkflowRuns(orgId, workflowId));
  }

  const enabledOnly = params.get("enabled") === "true";
  return ok(await listWorkflows(orgId, enabledOnly));
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;
  const orgId = ctx.organizationId ?? (rest.organizationId as string);

  if (!orgId) return problem("Organization context required", 400);

  if (action === "create" || !action) {
    const wf = await createWorkflow(workflowSchema.parse({ ...rest, organizationId: orgId }));
    return created(wf);
  }

  if (action === "run") {
    const { workflowId, eventId, input } = rest as { workflowId?: string; eventId?: string; input?: Record<string, unknown> };
    if (!workflowId) return problem("workflowId required for run action", 400);
    const run = await runWorkflow(workflowRunSchema.parse({
      workflowId,
      organizationId: orgId,
      eventId,
      input: input ?? {},
    }));
    return ok(run);
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function PATCH(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const id   = request.nextUrl.searchParams.get("id");
  if (!id) return problem("Workflow ID required", 400);

  const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
  const orgId = ctx.organizationId ?? (body.organizationId as string);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await updateWorkflow(id, { ...body, organizationId: orgId }));
}

export async function DELETE(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const id   = request.nextUrl.searchParams.get("id");
  const orgId = ctx.organizationId;
  if (!id)    return problem("Workflow ID required", 400);
  if (!orgId) return problem("Organization context required", 400);

  return ok(await deleteWorkflow(orgId, id));
}
