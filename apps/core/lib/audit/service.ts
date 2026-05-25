/**
 * KENUXA CORE — Audit Log Service
 *
 * Immutable audit trail for all critical actions across the ecosystem.
 * Records: who, what, when, from where, success/failure.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const auditLogSchema = z.object({
  organizationId: z.string().uuid().optional(),
  userId:         z.string().optional(),
  actorType:      z.enum(["user","system","api_key","service"]).default("user"),
  actorId:        z.string().min(1),
  action:         z.string().min(1),
  resourceType:   z.string().min(1),
  resourceId:     z.string().optional(),
  description:    z.string().optional(),
  ipAddress:      z.string().optional(),
  userAgent:      z.string().optional(),
  requestId:      z.string().optional(),
  status:         z.enum(["success","failure","error"]).default("success"),
  metadata:       z.record(z.unknown()).default({}),
});

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_LOGS = [
  { id: "al1", actor_type: "user",    actor_id: "usr_demo", action: "auth.login",           resource_type: "session",      status: "success", created_at: new Date(Date.now() - 300_000).toISOString() },
  { id: "al2", actor_type: "user",    actor_id: "usr_demo", action: "api_key.create",        resource_type: "api_key",      status: "success", created_at: new Date(Date.now() - 3600_000).toISOString() },
  { id: "al3", actor_type: "system",  actor_id: "core",     action: "workflow.run",          resource_type: "workflow",     status: "success", created_at: new Date(Date.now() - 7200_000).toISOString() },
  { id: "al4", actor_type: "api_key", actor_id: "kx_live_", action: "memory.create",         resource_type: "memory_entry", status: "success", created_at: new Date(Date.now() - 86400_000).toISOString() },
  { id: "al5", actor_type: "user",    actor_id: "usr_demo", action: "wallet.transfer",       resource_type: "wallet",       status: "failure", created_at: new Date(Date.now() - 172800_000).toISOString() },
];

// ─── Write ────────────────────────────────────────────────────────────────────

export async function writeAuditLog(rawInput: z.input<typeof auditLogSchema>) {
  const input = auditLogSchema.parse(rawInput);
  if (!isSupabaseConfigured) return { id: `al_${Date.now()}`, ...input, created_at: new Date().toISOString() };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      organization_id: input.organizationId,
      user_id:         input.userId,
      actor_type:      input.actorType,
      actor_id:        input.actorId,
      action:          input.action,
      resource_type:   input.resourceType,
      resource_id:     input.resourceId,
      description:     input.description,
      ip_address:      input.ipAddress,
      user_agent:      input.userAgent,
      request_id:      input.requestId,
      status:          input.status,
      metadata:        input.metadata,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Fire-and-forget audit log — does not throw on failure */
export function logAudit(rawInput: z.input<typeof auditLogSchema>) {
  writeAuditLog(rawInput).catch(() => {
    // Audit logging must never break the calling flow
  });
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function listAuditLogs(
  organizationId: string,
  options: {
    userId?:       string;
    action?:       string;
    resourceType?: string;
    status?:       string;
    since?:        string;
    limit?:        number;
    offset?:       number;
  } = {},
) {
  if (!isSupabaseConfigured) return { logs: MOCK_LOGS, total: MOCK_LOGS.length };

  const { userId, action, resourceType, status, since, limit = 50, offset = 0 } = options;
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId)       query = query.eq("user_id", userId);
  if (action)       query = query.eq("action", action);
  if (resourceType) query = query.eq("resource_type", resourceType);
  if (status)       query = query.eq("status", status);
  if (since)        query = query.gte("created_at", since);

  const { data, count, error } = await query;
  if (error) throw error;
  return { logs: data ?? [], total: count ?? 0 };
}

export async function getAuditStats(organizationId: string, days = 7) {
  if (!isSupabaseConfigured) {
    return {
      total: 47, success: 45, failure: 2,
      by_action: { "auth.login": 12, "api_key.create": 3, "workflow.run": 20, "memory.create": 12 },
      by_actor_type: { user: 30, system: 15, api_key: 2 },
    };
  }

  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data } = await supabase
    .from("audit_logs")
    .select("action, actor_type, status")
    .eq("organization_id", organizationId)
    .gte("created_at", since);

  const byAction: Record<string, number>    = {};
  const byActorType: Record<string, number> = {};
  let success = 0, failure = 0;

  for (const log of data ?? []) {
    byAction[log.action] = (byAction[log.action] ?? 0) + 1;
    byActorType[log.actor_type] = (byActorType[log.actor_type] ?? 0) + 1;
    if (log.status === "success") success++;
    else failure++;
  }

  return {
    total: (data ?? []).length,
    success,
    failure,
    by_action: byAction,
    by_actor_type: byActorType,
  };
}
