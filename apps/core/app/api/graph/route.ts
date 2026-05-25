/**
 * KENUXA CORE — Knowledge Graph API
 *
 * GET    /api/graph?action=list&type=company&limit=50
 * GET    /api/graph?action=search&q=safaricom&types=company,product
 * GET    /api/graph?action=stats
 * GET    /api/graph?action=edges&nodeId=:id
 * POST   /api/graph  { action: "create_node", ... }
 * POST   /api/graph  { action: "create_edge", ... }
 * DELETE /api/graph?action=delete_node&id=:id
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  createGraphNode, createGraphEdge, listGraphNodes, listGraphEdges,
  searchGraphNodes, getGraphStats, deleteGraphNode,
  graphNodeSchema, graphEdgeSchema, graphSearchSchema,
  GraphNodeType,
} from "@/lib/graph/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "list";
  const orgId  = ctx.organizationId ?? params.get("organizationId") ?? "";

  if (!orgId) return problem("Organization context required", 400);

  if (action === "list") {
    const type  = params.get("type") as GraphNodeType | null;
    const limit  = Number(params.get("limit") ?? 50);
    const offset = Number(params.get("offset") ?? 0);
    return ok(await listGraphNodes(orgId, type ?? undefined, limit, offset));
  }

  if (action === "search") {
    const q     = params.get("q") ?? "";
    const types = params.get("types")?.split(",") ?? undefined;
    return ok(await searchGraphNodes(graphSearchSchema.parse({ organizationId: orgId, query: q, types })));
  }

  if (action === "edges") {
    const nodeId = params.get("nodeId") ?? undefined;
    const limit  = Number(params.get("limit") ?? 50);
    return ok(await listGraphEdges(orgId, nodeId, limit));
  }

  if (action === "stats") {
    return ok(await getGraphStats(orgId));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;
  const orgId = ctx.organizationId ?? (rest.organizationId as string);

  if (!orgId) return problem("Organization context required", 400);

  if (action === "create_node" || action === "create") {
    const node = await createGraphNode(graphNodeSchema.parse({ ...rest, organizationId: orgId }));
    return created(node);
  }

  if (action === "create_edge") {
    const edge = await createGraphEdge(graphEdgeSchema.parse({ ...rest, organizationId: orgId }));
    return created(edge);
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function DELETE(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const nodeId = params.get("id");
  const orgId  = ctx.organizationId;

  if (!nodeId) return problem("Node ID required", 400);
  if (!orgId)  return problem("Organization context required", 400);

  return ok(await deleteGraphNode(orgId, nodeId));
}
