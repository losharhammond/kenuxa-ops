/**
 * KENUXA OPS — Command Execution Log
 *
 * POST /api/ops/commands  — log a new command execution
 * GET  /api/ops/commands  — list command history for org
 */

import { NextRequest } from "next/server";
import { ok, created, problem } from "@/lib/api";
import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

const commandSchema = z.object({
  organizationId:  z.string().uuid(),
  userId:          z.string().uuid().optional(),
  commandType:     z.enum(["voice","text","api","scheduled"]).default("text"),
  input:           z.string().min(1),
  parsedIntent:    z.record(z.unknown()).optional(),
  executionPlan:   z.record(z.unknown()).optional(),
  status:          z.enum(["pending","running","completed","failed","cancelled"]).default("completed"),
  result:          z.record(z.unknown()).optional(),
  error:           z.string().optional(),
  durationMs:      z.number().optional(),
  appSource:       z.string().default("ops"),
  metadata:        z.record(z.unknown()).default({}),
});

export async function POST(request: NextRequest) {
  const body  = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = commandSchema.parse(body);

  if (!isSupabaseConfigured) {
    return created({
      id: `cmd_${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ops_commands")
    .insert({
      organization_id: input.organizationId,
      user_id:         input.userId,
      command_type:    input.commandType,
      input:           input.input,
      parsed_intent:   input.parsedIntent,
      execution_plan:  input.executionPlan,
      status:          input.status,
      result:          input.result,
      error:           input.error,
      duration_ms:     input.durationMs,
      app_source:      input.appSource,
      metadata:        input.metadata,
      completed_at:    input.status === "completed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) {
    return problem(error.message, 500);
  }
  return created(data);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const orgId  = params.get("orgId");
  const limit  = Number(params.get("limit") ?? 50);
  const offset = Number(params.get("offset") ?? 0);
  const status = params.get("status") ?? undefined;

  if (!orgId) return problem("orgId required", 400);

  if (!isSupabaseConfigured) {
    return ok({
      commands: [
        { id: "cmd_1", command_type: "text", input: "Show sales report for Q2", status: "completed", duration_ms: 1240, created_at: new Date().toISOString() },
        { id: "cmd_2", command_type: "voice", input: "Schedule team meeting tomorrow 10am", status: "completed", duration_ms: 890, created_at: new Date(Date.now() - 3600_000).toISOString() },
      ],
      total: 2,
    });
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("ops_commands")
    .select("*", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return problem(error.message, 500);
  return ok({ commands: data ?? [], total: count ?? 0 });
}
