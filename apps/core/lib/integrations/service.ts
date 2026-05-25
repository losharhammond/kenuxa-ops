/**
 * KENUXA CORE — Integration Layer Service
 *
 * Manages third-party integrations: WhatsApp, Telegram, Email, SMS,
 * crawlers, AI agents, and custom webhook-based connectors.
 * Secrets are stored as references (never in plaintext in DB).
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const INTEGRATION_PROVIDERS = [
  "whatsapp", "telegram", "email", "sms",
  "browser_extension", "desktop", "mobile",
  "crawler", "ai_agent",
  "slack", "sendgrid", "resend",
  "cloudflare", "github_actions", "sentry",
  "custom",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const integrationSchema = z.object({
  organizationId: z.string().uuid(),
  provider:       z.enum(INTEGRATION_PROVIDERS),
  name:           z.string().min(2).max(255),
  config:         z.record(z.unknown()).default({}),
  secretRef:      z.string().optional(),
  enabled:        z.boolean().default(true),
});

export const integrationUpdateSchema = integrationSchema.partial().required({ organizationId: true });

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createIntegration(
  createdBy: string,
  rawInput: z.input<typeof integrationSchema>,
) {
  const input = integrationSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id: `int_${Date.now()}`,
      organization_id: input.organizationId,
      provider: input.provider,
      name:     input.name,
      config:   input.config,
      enabled:  input.enabled,
      status:   "configured",
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .insert({
      organization_id: input.organizationId,
      provider:        input.provider,
      name:            input.name,
      config:          input.config,
      secret_ref:      input.secretRef ?? null,
      enabled:         input.enabled,
      created_by:      createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listIntegrations(organizationId: string) {
  if (!isSupabaseConfigured) {
    return [
      { id: "int_demo_1", provider: "groq",    name: "Groq AI",   enabled: true,  created_at: new Date().toISOString() },
      { id: "int_demo_2", provider: "sendgrid", name: "SendGrid",  enabled: true,  created_at: new Date().toISOString() },
      { id: "int_demo_3", provider: "slack",    name: "Slack",     enabled: false, created_at: new Date().toISOString() },
    ];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("id, provider, name, config, enabled, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getIntegration(organizationId: string, integrationId: string) {
  if (!isSupabaseConfigured) {
    return { id: integrationId, provider: "custom", name: "Demo Integration", enabled: true };
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .select("id, provider, name, config, enabled, created_at")
    .eq("id", integrationId)
    .eq("organization_id", organizationId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateIntegration(
  integrationId: string,
  rawInput: z.input<typeof integrationUpdateSchema>,
) {
  const input = integrationUpdateSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return { id: integrationId, ...input, updated_at: new Date().toISOString() };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("integrations")
    .update({
      ...(input.name    !== undefined && { name: input.name }),
      ...(input.config  !== undefined && { config: input.config }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", integrationId)
    .eq("organization_id", input.organizationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIntegration(organizationId: string, integrationId: string) {
  if (!isSupabaseConfigured) return { deleted: true };
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("id", integrationId)
    .eq("organization_id", organizationId);
  if (error) throw error;
  return { deleted: true };
}
