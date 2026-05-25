/**
 * KENUXA CORE — Knowledge Graph Service
 *
 * Manages graph_nodes and graph_edges in Supabase.
 * Nodes represent entities: companies, people, markets, products, sectors, etc.
 * Edges represent typed, weighted relationships between nodes.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const NODE_TYPES = [
  "person", "company", "organization", "community", "product",
  "dataset", "campaign", "signal", "market", "sector",
  "location", "country", "technology", "trend", "event", "regulation", "fund",
] as const;

export type GraphNodeType = (typeof NODE_TYPES)[number];

export const graphNodeSchema = z.object({
  organizationId: z.string().uuid(),
  type:           z.enum(NODE_TYPES),
  canonical_name: z.string().min(2).max(255),
  tags:           z.array(z.string()).default([]),
  source_url:     z.string().url().optional(),
  properties:     z.record(z.unknown()).default({}),
});

export const graphEdgeSchema = z.object({
  organizationId: z.string().uuid(),
  fromNodeId:     z.string().uuid(),
  toNodeId:       z.string().uuid(),
  relationship:   z.string().min(2).max(100),
  weight:         z.number().min(0).max(1).default(0.5),
  properties:     z.record(z.unknown()).default({}),
});

export const graphSearchSchema = z.object({
  organizationId: z.string().uuid(),
  query:          z.string().min(1),
  types:          z.array(z.enum(NODE_TYPES)).optional(),
  limit:          z.number().int().min(1).max(100).default(20),
});

// ─── Node CRUD ───────────────────────────────────────────────────────────────

export async function createGraphNode(rawInput: z.input<typeof graphNodeSchema>) {
  const input = graphNodeSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id: `node_${Date.now()}`,
      canonical_name: input.canonical_name,
      type: input.type,
      tags: input.tags,
      properties: input.properties,
      organization_id: input.organizationId,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("graph_nodes")
    .insert({
      organization_id: input.organizationId,
      type:            input.type,
      label:           input.canonical_name,
      properties: {
        canonical_name: input.canonical_name,
        tags:           input.tags,
        source_url:     input.source_url,
        ...input.properties,
      },
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listGraphNodes(
  organizationId: string,
  type?: GraphNodeType,
  limit = 50,
  offset = 0,
) {
  if (!isSupabaseConfigured) {
    return [
      { id: "node_demo_1", label: "Safaricom",   type: "company",  properties: { canonical_name: "Safaricom", tags: ["telco","kenya"] }  },
      { id: "node_demo_2", label: "M-Pesa",      type: "product",  properties: { canonical_name: "M-Pesa",   tags: ["fintech","mobile"] } },
      { id: "node_demo_3", label: "East Africa", type: "location", properties: { canonical_name: "East Africa", tags: ["region"] }       },
    ];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("graph_nodes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function searchGraphNodes(rawInput: z.input<typeof graphSearchSchema>) {
  const input = graphSearchSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return [{ id: "node_search_demo", label: input.query, type: "company", properties: {} }];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("graph_nodes")
    .select("*")
    .eq("organization_id", input.organizationId)
    .ilike("label", `%${input.query}%`)
    .limit(input.limit);

  if (input.types?.length) {
    query = query.in("type", input.types);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getGraphNode(organizationId: string, nodeId: string) {
  if (!isSupabaseConfigured) {
    return { id: nodeId, label: "Demo Node", type: "company", properties: {} };
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("graph_nodes")
    .select("*")
    .eq("id", nodeId)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGraphNode(organizationId: string, nodeId: string) {
  if (!isSupabaseConfigured) return { deleted: true };
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("graph_nodes")
    .delete()
    .eq("id", nodeId)
    .eq("organization_id", organizationId);
  if (error) throw error;
  return { deleted: true };
}

// ─── Edge CRUD ───────────────────────────────────────────────────────────────

export async function createGraphEdge(rawInput: z.input<typeof graphEdgeSchema>) {
  const input = graphEdgeSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id: `edge_${Date.now()}`,
      from_node_id: input.fromNodeId,
      to_node_id:   input.toNodeId,
      relationship: input.relationship,
      weight:       input.weight,
      properties:   input.properties,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("graph_edges")
    .insert({
      organization_id: input.organizationId,
      from_node_id:    input.fromNodeId,
      to_node_id:      input.toNodeId,
      relationship:    input.relationship,
      weight:          input.weight,
      properties:      input.properties,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listGraphEdges(organizationId: string, nodeId?: string, limit = 50) {
  if (!isSupabaseConfigured) {
    return [{ id: "edge_demo", relationship: "OPERATES", weight: 0.98, from_node_id: "node_demo_1", to_node_id: "node_demo_2" }];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("graph_edges")
    .select("*, from_node:graph_nodes!from_node_id(id, label, type), to_node:graph_nodes!to_node_id(id, label, type)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (nodeId) {
    query = query.or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── Graph Stats ──────────────────────────────────────────────────────────────

export async function getGraphStats(organizationId: string) {
  if (!isSupabaseConfigured) {
    return { node_count: 2847, edge_count: 8412, type_distribution: {} };
  }

  const supabase = createSupabaseAdminClient();
  const [nodesResult, edgesResult] = await Promise.all([
    supabase.from("graph_nodes").select("type").eq("organization_id", organizationId),
    supabase.from("graph_edges").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  const type_distribution: Record<string, number> = {};
  if (nodesResult.data) {
    for (const node of nodesResult.data) {
      type_distribution[node.type] = (type_distribution[node.type] ?? 0) + 1;
    }
  }

  return {
    node_count: nodesResult.data?.length ?? 0,
    edge_count: edgesResult.count ?? 0,
    type_distribution,
  };
}
