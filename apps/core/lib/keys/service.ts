/**
 * KENUXA CORE — API Key Service
 *
 * Manages scoped API keys for all KENUXA products.
 * Keys are stored as bcrypt/SHA-256 hashes — plaintext is shown ONCE.
 * Each key has: org scope, named scopes, rate limits, expiry.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const ALL_SCOPES = [
  "ai:read", "ai:write",
  "memory:read", "memory:write",
  "graph:read", "graph:write",
  "events:read", "events:write",
  "org:read", "org:write",
  "keys:read", "keys:write",
  "analytics:read",
  "workflows:read", "workflows:write",
  "integrations:read", "integrations:write",
] as const;

export type ApiKeyScope = (typeof ALL_SCOPES)[number];

export const createKeySchema = z.object({
  organizationId:    z.string().uuid(),
  name:              z.string().min(2).max(100),
  scopes:            z.array(z.string()).default(["ai:read"]),
  rateLimitPerMinute:z.number().int().min(1).max(10000).default(120),
  expiresAt:         z.string().datetime().optional(),
});

// ─── Key Generation ───────────────────────────────────────────────────────────

function generateApiKey(organizationId: string, name: string): string {
  const slug   = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 12);
  const prefix = `kx_live_${slug}_`;
  const random = Array.from({ length: 32 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)],
  ).join("");
  return prefix + random;
}

async function hashKey(key: string): Promise<string> {
  // Simple deterministic hash for Phase 1 (no crypto module needed in Edge)
  const encoder = new TextEncoder();
  const data  = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createApiKey(
  createdBy: string,
  rawInput: z.input<typeof createKeySchema>,
) {
  const input  = createKeySchema.parse(rawInput);
  const rawKey = generateApiKey(input.organizationId, input.name);
  const keyHash = await hashKey(rawKey);

  if (!isSupabaseConfigured) {
    return {
      id:               `key_${Date.now()}`,
      organization_id:  input.organizationId,
      name:             input.name,
      scopes:           input.scopes,
      rate_limit_per_minute: input.rateLimitPerMinute,
      expires_at:       input.expiresAt ?? null,
      created_at:       new Date().toISOString(),
      // Only returned once — never stored
      raw_key:          rawKey,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      organization_id:        input.organizationId,
      name:                   input.name,
      key_hash:               keyHash,
      scopes:                 input.scopes,
      rate_limit_per_minute:  input.rateLimitPerMinute,
      expires_at:             input.expiresAt ?? null,
      created_by:             createdBy,
    })
    .select("id, organization_id, name, scopes, rate_limit_per_minute, expires_at, created_at")
    .single();

  if (error) throw error;

  // Return raw key ONCE — never again
  return { ...data, raw_key: rawKey };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listApiKeys(organizationId: string) {
  if (!isSupabaseConfigured) {
    return [
      {
        id: "key_demo_1", name: "REACH Production", scopes: ["ai:read","memory:write","graph:read"],
        rate_limit_per_minute: 120, last_used_at: new Date().toISOString(),
        expires_at: null, revoked_at: null, created_at: new Date().toISOString(),
      },
    ];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, scopes, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

export async function revokeApiKey(organizationId: string, keyId: string) {
  if (!isSupabaseConfigured) return { revoked: true };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("organization_id", organizationId);

  if (error) throw error;
  return { revoked: true };
}

// ─── Validate (used by API middleware) ────────────────────────────────────────

export async function validateApiKey(rawKey: string): Promise<{
  valid: boolean;
  organizationId?: string;
  scopes?: string[];
  keyId?: string;
}> {
  if (!isSupabaseConfigured) {
    return { valid: true, organizationId: "org_demo", scopes: ["ai:read"], keyId: "key_demo" };
  }

  const hash = await hashKey(rawKey);
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("api_keys")
    .select("id, organization_id, scopes, expires_at, revoked_at")
    .eq("key_hash", hash)
    .single();

  if (!data) return { valid: false };
  if (data.revoked_at) return { valid: false };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false };

  // Update last_used_at asynchronously
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});

  return {
    valid:          true,
    organizationId: data.organization_id,
    scopes:         data.scopes as string[],
    keyId:          data.id,
  };
}
