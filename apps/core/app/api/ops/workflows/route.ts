/**
 * KENUXA OPS — Workflow Bridge
 *
 * GET  /api/ops/workflows?orgId=:id          — list workflows for org
 * POST /api/ops/workflows { action: "run" }  — trigger workflow execution
 */

import { NextRequest } from "next/server";
import { ok, created, problem } from "@/lib/api";
import { listWorkflows, runWorkflow } from "@/lib/workflows/service";
import { logAudit } from "@/lib/audit/service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orgId  = params.get("orgId");
  if (!orgId) return problem("orgId required", 400);

  const workflows = await listWorkflows(orgId, true);
  return ok(workflows);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;

  if (action === "run" || !action) {
    const workflowId     = rest.workflowId as string;
    const organizationId = rest.organizationId as string;

    if (!workflowId || !organizationId) return problem("workflowId and organizationId required", 400);

    const result = await runWorkflow({ workflowId, organizationId, input: rest.context as Record<string, unknown> });
    logAudit({
      organizationId,
      actorId: "ops_service",
      actorType: "service",
      action: "workflow.run",
      resourceType: "workflow",
      resourceId: workflowId,
      status: "success",
      metadata: { run_id: (result as Record<string, unknown>).id },
    });
    return created(result);
  }

  return problem(`Unknown action: ${action}`, 400);
}
