/**
 * KENUXA CORE — Analytics Service
 *
 * Lightweight internal analytics backed by Supabase.
 * Tracks AI usage, event throughput, memory operations,
 * system health, and per-product usage breakdowns.
 * Does NOT depend on expensive third-party analytics tools.
 */

import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── System Health ────────────────────────────────────────────────────────────

export async function getSystemHealth() {
  if (!isSupabaseConfigured) {
    return {
      status:            "operational",
      aiUsage:           { requestsToday: 3184, estimatedCostUsd: 0.42, avgLatencyMs: 248 },
      events:            { queuedCount: 0, processedToday: 847000, failedToday: 2400 },
      memory:            { totalRecords: 48712, vectorised: 47381 },
      workflows:         { active: 4, runsToday: 1187, successRate: 99.1 },
      integrations:      { active: 7, total: 12 },
      freeTierPosture:   "optimized",
    };
  }

  const supabase = createSupabaseAdminClient();
  const since24h = new Date(Date.now() - 86400_000).toISOString();

  const [aiResult, eventsResult, memResult] = await Promise.all([
    supabase.from("ai_requests").select("latency_ms, estimated_cost_usd").gte("created_at", since24h),
    supabase.from("events").select("status").gte("created_at", since24h),
    supabase.from("ai_memory").select("id", { count: "exact", head: true }),
  ]);

  const aiRows      = aiResult.data ?? [];
  const eventRows   = eventsResult.data ?? [];
  const totalCost   = aiRows.reduce((s, r) => s + (r.estimated_cost_usd ?? 0), 0);
  const avgLatency  = aiRows.length ? aiRows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / aiRows.length : 0;

  return {
    status:   "operational",
    aiUsage: {
      requestsToday:    aiRows.length,
      estimatedCostUsd: Number(totalCost.toFixed(4)),
      avgLatencyMs:     Math.round(avgLatency),
    },
    events: {
      queuedCount:    eventRows.filter(e => e.status === "queued").length,
      processedToday: eventRows.filter(e => e.status === "completed").length,
      failedToday:    eventRows.filter(e => e.status === "failed").length,
    },
    memory: {
      totalRecords: memResult.count ?? 0,
    },
    freeTierPosture: "optimized",
  };
}

// ─── AI Usage Analytics ───────────────────────────────────────────────────────

export async function getAiUsageStats(organizationId?: string, days = 1) {
  if (!isSupabaseConfigured) {
    return {
      total_requests:   3184,
      total_tokens:     4_800_000,
      total_cost_usd:   0.42,
      avg_latency_ms:   248,
      by_provider:      { groq: 3084, openai: 88, anthropic: 12 },
      by_product:       { REACH: 2284, VOICE: 570, ACADEMY: 158, OPS: 95, CORE: 63 },
    };
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  let query = supabase
    .from("ai_requests")
    .select("provider, model, prompt_tokens, completion_tokens, estimated_cost_usd, latency_ms, metadata")
    .gte("created_at", since);

  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const by_provider: Record<string, number> = {};
  const by_product:  Record<string, number> = {};
  let total_cost = 0;
  let total_latency = 0;
  let total_tokens = 0;

  for (const r of rows) {
    by_provider[r.provider] = (by_provider[r.provider] ?? 0) + 1;
    const product = (r.metadata as Record<string,unknown>)?.product as string | undefined;
    if (product) by_product[product] = (by_product[product] ?? 0) + 1;
    total_cost    += r.estimated_cost_usd ?? 0;
    total_latency += r.latency_ms ?? 0;
    total_tokens  += (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
  }

  return {
    total_requests:   rows.length,
    total_tokens,
    total_cost_usd:   Number(total_cost.toFixed(4)),
    avg_latency_ms:   rows.length ? Math.round(total_latency / rows.length) : 0,
    by_provider,
    by_product,
  };
}

// ─── Event Throughput ─────────────────────────────────────────────────────────

export async function getEventStats(organizationId?: string, days = 1) {
  if (!isSupabaseConfigured) {
    return { total: 847000, delivered: 844576, failed: 2424, by_source: {}, delivery_rate: "99.71" };
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  let query = supabase.from("events").select("status, source").gte("created_at", since);
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data, error } = await query;
  if (error) throw error;

  const rows       = data ?? [];
  const total      = rows.length;
  const delivered  = rows.filter(r => r.status === "completed").length;
  const failed     = rows.filter(r => r.status === "failed").length;
  const by_source: Record<string, number> = {};
  for (const r of rows) {
    by_source[r.source] = (by_source[r.source] ?? 0) + 1;
  }

  return {
    total,
    delivered,
    failed,
    by_source,
    delivery_rate: total > 0 ? ((delivered / total) * 100).toFixed(2) : "100.00",
  };
}

// ─── Usage Metrics Recorder ───────────────────────────────────────────────────

export async function recordUsageMetric(
  organizationId: string,
  metric: string,
  value: number,
  windowName: "hour" | "day" | "month" = "day",
) {
  if (!isSupabaseConfigured) return;

  const supabase = createSupabaseAdminClient();
  await supabase.from("usage_metrics").insert({
    organization_id: organizationId,
    metric,
    value,
    window_name: windowName,
  });
}

export async function getUsageMetrics(organizationId: string, metric?: string, days = 30) {
  if (!isSupabaseConfigured) {
    return [
      { metric: "ai_requests", value: 3184, recorded_at: new Date().toISOString() },
      { metric: "events",      value: 847000, recorded_at: new Date().toISOString() },
    ];
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  let query = supabase
    .from("usage_metrics")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false })
    .limit(500);

  if (metric) query = query.eq("metric", metric);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
