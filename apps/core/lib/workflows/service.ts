/**
 * KENUXA CORE — Workflow / Automation Engine Service
 *
 * Manages workflow definitions and execution runs in Supabase.
 * Workflows are triggered by: events, schedules, webhooks, or manual calls.
 * Each run is fully logged in workflow_runs for audit and retry.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const workflowSchema = z.object({
  organizationId: z.string().uuid(),
  name:           z.string().min(2).max(255),
  description:    z.string().optional(),
  trigger_type:   z.enum(["event", "schedule", "webhook", "manual"]),
  trigger_config: z.record(z.unknown()).default({}),
  conditions:     z.array(z.record(z.unknown())).default([]),
  actions:        z.array(z.record(z.unknown())).default([]),
  enabled:        z.boolean().default(true),
});

export const workflowUpdateSchema = workflowSchema.partial().required({ organizationId: true });

export const workflowRunSchema = z.object({
  workflowId:     z.string().uuid(),
  organizationId: z.string().uuid(),
  eventId:        z.string().uuid().optional(),
  input:          z.record(z.unknown()).default({}),
});

// ─── Workflow CRUD ────────────────────────────────────────────────────────────

export async function createWorkflow(rawInput: z.input<typeof workflowSchema>) {
  const input = workflowSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id: `wf_${Date.now()}`,
      version: 1,
      organization_id: input.organizationId,
      name:            input.name,
      trigger_type:    input.trigger_type,
      trigger_config:  input.trigger_config,
      conditions:      input.conditions,
      actions:         input.actions,
      enabled:         input.enabled,
      created_at:      new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workflows")
    .insert({
      organization_id: input.organizationId,
      name:            input.name,
      trigger_type:    input.trigger_type,
      trigger_config:  input.trigger_config,
      conditions:      input.conditions,
      actions:         input.actions,
      enabled:         input.enabled,
      version:         1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listWorkflows(organizationId: string, enabledOnly = false) {
  if (!isSupabaseConfigured) {
    return [
      {
        id: "wf_demo_1", name: "Daily Market Intelligence", trigger_type: "schedule",
        trigger_config: { cron: "0 6 * * *" }, enabled: true, version: 1,
        conditions: [], actions: [],
      },
    ];
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("workflows")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (enabledOnly) query = query.eq("enabled", true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getWorkflow(organizationId: string, workflowId: string) {
  if (!isSupabaseConfigured) {
    return { id: workflowId, name: "Demo Workflow", trigger_type: "manual", enabled: true };
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkflow(workflowId: string, rawInput: z.input<typeof workflowUpdateSchema>) {
  const input = workflowUpdateSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return { id: workflowId, ...input, updated_at: new Date().toISOString() };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workflows")
    .update({
      ...(input.name           !== undefined && { name: input.name }),
      ...(input.description    !== undefined && { description: input.description }),
      ...(input.trigger_type   !== undefined && { trigger_type: input.trigger_type }),
      ...(input.trigger_config !== undefined && { trigger_config: input.trigger_config }),
      ...(input.conditions     !== undefined && { conditions: input.conditions }),
      ...(input.actions        !== undefined && { actions: input.actions }),
      ...(input.enabled        !== undefined && { enabled: input.enabled }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflowId)
    .eq("organization_id", input.organizationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkflow(organizationId: string, workflowId: string) {
  if (!isSupabaseConfigured) return { deleted: true };
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("organization_id", organizationId);
  if (error) throw error;
  return { deleted: true };
}

// ─── Workflow Execution ───────────────────────────────────────────────────────

export async function runWorkflow(rawInput: z.input<typeof workflowRunSchema>) {
  const input = workflowRunSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id: `run_${Date.now()}`,
      workflow_id:     input.workflowId,
      organization_id: input.organizationId,
      status:          "completed",
      output:          { message: "Demo run completed" },
      started_at:      new Date().toISOString(),
      finished_at:     new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdminClient();

  // Create run record
  const { data: run, error: runError } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_id:     input.workflowId,
      organization_id: input.organizationId,
      event_id:        input.eventId,
      status:          "queued",
      input:           input.input,
      started_at:      new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runError) throw runError;

  // Fetch workflow definition
  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", input.workflowId)
    .single();

  if (!workflow) {
    await supabase.from("workflow_runs").update({ status: "failed", error: "Workflow not found" }).eq("id", run.id);
    throw new Error("Workflow not found: " + input.workflowId);
  }

  try {
    // Execute actions (simplified action runner — Phase 1 fires events per action)
    const output = await executeWorkflowActions(
      workflow.actions as WorkflowAction[],
      input.input,
      supabase,
    );

    await supabase.from("workflow_runs").update({
      status:      "completed",
      output,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);

    return { ...run, status: "completed", output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("workflow_runs").update({
      status:      "failed",
      error:       message,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);
    throw err;
  }
}

export async function listWorkflowRuns(organizationId: string, workflowId?: string, limit = 50) {
  if (!isSupabaseConfigured) {
    return [{ id: "run_demo", workflow_id: workflowId ?? "wf_demo", status: "completed", created_at: new Date().toISOString() }];
  }
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("workflow_runs")
    .select("*, workflow:workflows(name, trigger_type)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (workflowId) query = query.eq("workflow_id", workflowId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── Internal Action Runner ───────────────────────────────────────────────────

type WorkflowAction = {
  type: "publish_event" | "call_webhook" | "run_ai" | "wait" | "log";
  config: Record<string, unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeWorkflowActions(actions: WorkflowAction[], context: Record<string, unknown>, supabase: any) {
  const results: unknown[] = [];

  for (const action of actions) {
    switch (action.type) {
      case "publish_event": {
        const eventData = {
          event:           String(action.config.event ?? "workflow.action.fired"),
          source:          "kenuxa-core-workflow",
          organization_id: String(context.organizationId ?? ""),
          payload:         { context, config: action.config },
          status:          "queued",
        };
        const { data } = await supabase.from("events").insert(eventData).select("id").single();
        results.push({ type: "publish_event", eventId: data?.id });
        break;
      }

      case "call_webhook": {
        const url = String(action.config.url ?? "");
        if (url) {
          try {
            await fetch(url, {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({ context, config: action.config }),
            });
            results.push({ type: "call_webhook", url, status: "fired" });
          } catch {
            results.push({ type: "call_webhook", url, status: "failed" });
          }
        }
        break;
      }

      case "log":
        results.push({ type: "log", message: action.config.message ?? "workflow step executed" });
        break;

      default:
        results.push({ type: action.type, skipped: true });
    }
  }

  return { actions_executed: results.length, results };
}
