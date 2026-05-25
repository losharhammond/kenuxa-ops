/**
 * KENUXA CORE — Memory Engine Service
 *
 * Typed, persistent intelligence layer for all KENUXA products.
 * Stores episodic, semantic, procedural, and working memory records.
 * Supports text search and (when embeddings are available) vector similarity.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const MEMORY_TYPES = [
  "user", "organization", "workflow", "ai_interaction",
  "business", "vector", "conversation",
  // Richer types used by REACH and VOICE
  "episodic", "semantic", "procedural", "working",
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

export const memorySchema = z.object({
  organizationId: z.string(),
  userId:         z.string().optional(),
  type:           z.string().min(2),   // broad — accept any type string
  title:          z.string().min(2),
  content:        z.string().min(2),
  tags:           z.array(z.string()).default([]),
  product:        z.string().optional(),
  metadata:       z.record(z.unknown()).default({}),
});

export const memorySearchSchema = z.object({
  organizationId: z.string(),
  query:          z.string().min(1),
  type:           z.string().optional(),
  product:        z.string().optional(),
  limit:          z.number().int().min(1).max(100).default(10),
});

export const memoryUpdateSchema = z.object({
  organizationId: z.string(),
  title:          z.string().min(2).optional(),
  content:        z.string().min(2).optional(),
  tags:           z.array(z.string()).optional(),
  metadata:       z.record(z.unknown()).optional(),
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createMemory(rawInput: z.input<typeof memorySchema>) {
  const input = memorySchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id: `mem_${Date.now()}`,
      organization_id: input.organizationId,
      user_id:         input.userId,
      type:            input.type,
      title:           input.title,
      content:         input.content,
      tags:            input.tags,
      metadata: { ...input.metadata, product: input.product },
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdminClient();

  // Normalise type to valid DB enum — fall back to 'vector' for unknown types
  const dbType = (["user","organization","workflow","ai_interaction","business","vector","conversation"] as string[]).includes(input.type)
    ? input.type
    : "vector";

  const { data, error } = await supabase
    .from("ai_memory")
    .insert({
      organization_id: input.organizationId,
      user_id:         input.userId ?? null,
      type:            dbType,
      title:           input.title,
      content:         input.content,
      tags:            input.tags,
      metadata: {
        ...input.metadata,
        memory_type: input.type,  // preserve richer type in metadata
        product:     input.product ?? "core",
      },
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listMemory(
  organizationId: string,
  type?: string,
  product?: string,
  limit = 20,
  offset = 0,
) {
  if (!isSupabaseConfigured) {
    return [
      {
        id: "mem_demo_1", type: "semantic", title: "Ghana FinTech Growth",
        content: "FinTech sector in Ghana growing at 34% CAGR driven by mobile money.",
        tags: ["fintech","ghana"], created_at: new Date().toISOString(),
      },
    ];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("ai_memory")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    // Support both DB-level type and metadata-level memory_type
    const dbType = (["user","organization","workflow","ai_interaction","business","vector","conversation"] as string[]).includes(type)
      ? type : "vector";
    query = query.eq("type", dbType);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Post-filter by metadata.product if requested
  if (product && data) {
    return data.filter(r => (r.metadata as Record<string, unknown>)?.product === product);
  }

  return data;
}

export async function searchMemory(rawInput: z.input<typeof memorySearchSchema>) {
  const input = memorySearchSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return [
      {
        id: "mem_search_demo",
        title:   "Organization context",
        content: "KENUXA CORE is shared intelligence infrastructure for Africa.",
        type:    "semantic",
        score:   0.91,
      },
    ];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("ai_memory")
    .select("*")
    .eq("organization_id", input.organizationId)
    .or(`content.ilike.%${input.query}%,title.ilike.%${input.query}%`)
    .limit(input.limit);

  if (input.type) {
    const dbType = (["user","organization","workflow","ai_interaction","business","vector","conversation"] as string[]).includes(input.type)
      ? input.type : "vector";
    query = query.eq("type", dbType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getMemoryRecord(organizationId: string, memoryId: string) {
  if (!isSupabaseConfigured) {
    return { id: memoryId, title: "Demo Memory", type: "semantic", content: "", tags: [] };
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ai_memory")
    .select("*")
    .eq("id", memoryId)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateMemory(
  organizationId: string,
  memoryId: string,
  rawInput: z.input<typeof memoryUpdateSchema>,
) {
  const input = memoryUpdateSchema.parse(rawInput);
  if (!isSupabaseConfigured) return { id: memoryId, ...input };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ai_memory")
    .update({
      ...(input.title   !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      ...(input.tags    !== undefined && { tags: input.tags }),
      ...(input.metadata!== undefined && { metadata: input.metadata }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memoryId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMemory(organizationId: string, memoryId: string) {
  if (!isSupabaseConfigured) return { deleted: true };
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("ai_memory")
    .delete()
    .eq("id", memoryId)
    .eq("organization_id", organizationId);
  if (error) throw error;
  return { deleted: true };
}

// ─── Memory Stats ─────────────────────────────────────────────────────────────

export async function getMemoryStats(organizationId: string) {
  if (!isSupabaseConfigured) {
    return { total: 48712, by_type: {}, vectorised: 47381 };
  }
  const supabase = createSupabaseAdminClient();
  const [memResult, vecResult] = await Promise.all([
    supabase.from("ai_memory").select("type").eq("organization_id", organizationId),
    supabase.from("vector_embeddings").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  const by_type: Record<string, number> = {};
  if (memResult.data) {
    for (const r of memResult.data) {
      by_type[r.type] = (by_type[r.type] ?? 0) + 1;
    }
  }

  return {
    total:      memResult.data?.length ?? 0,
    vectorised: vecResult.count ?? 0,
    by_type,
  };
}

// ─── Vector Embedding Storage ─────────────────────────────────────────────────

export async function storeEmbedding(
  organizationId: string,
  memoryId: string,
  content: string,
  embedding: number[],
  sourceType = "ai_memory",
) {
  if (!isSupabaseConfigured) return { id: `vec_${Date.now()}` };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("vector_embeddings")
    .insert({
      organization_id: organizationId,
      memory_id:       memoryId,
      source_type:     sourceType,
      source_id:       memoryId,
      content,
      embedding:       `[${embedding.join(",")}]`,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}
