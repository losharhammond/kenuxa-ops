/**
 * KENUXA CORE — Organization Service
 *
 * Multi-tenant organization management.
 * Each org scopes: products, datasets, memory, AI context, keys, analytics.
 * Members have typed roles; admins can invite/remove members.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Role } from "@/lib/types";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const organizationSchema = z.object({
  name:    z.string().min(2).max(255),
  slug:    z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  tier:    z.enum(["free", "growth", "scale", "enterprise"]).default("free"),
  branding: z.record(z.unknown()).default({}),
  quotas:  z.record(z.number()).default({ ai_requests_monthly: 1000, events_monthly: 10000 }),
});

export const organizationUpdateSchema = organizationSchema.partial();

export const inviteMemberSchema = z.object({
  email:          z.string().email(),
  role:           z.enum(["organization_admin","operator","analyst","contributor","viewer"]).default("viewer"),
  organizationId: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  userId:         z.string().uuid(),
  role:           z.enum(["organization_admin","operator","analyst","contributor","viewer"]),
  organizationId: z.string().uuid(),
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createOrganization(
  ownerId: string,
  rawInput: z.input<typeof organizationSchema>,
) {
  const input = organizationSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return {
      id:                `org_${Date.now()}`,
      owner_id:          ownerId,
      name:              input.name,
      slug:              input.slug,
      subscription_tier: input.tier,
      branding:          input.branding,
      quotas:            input.quotas,
      created_at:        new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name:              input.name,
      slug:              input.slug,
      subscription_tier: input.tier,
      branding:          input.branding,
      quotas:            input.quotas,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Add creator as owner
  await supabase.from("organization_members").insert({
    organization_id: data.id,
    user_id:         ownerId,
    role:            "organization_owner",
  });

  return data;
}

export async function listOrganizations(userId: string) {
  if (!isSupabaseConfigured) {
    return [{
      role: "organization_owner",
      organizations: {
        id: "org_demo", name: "KENUXA Demo Org", slug: "kenuxa-demo",
        subscription_tier: "free", created_at: new Date().toISOString(),
      },
    }];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function getOrganization(orgId: string) {
  if (!isSupabaseConfigured) {
    return { id: orgId, name: "Demo Org", slug: "demo", subscription_tier: "free" };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(orgId: string, rawInput: z.input<typeof organizationUpdateSchema>) {
  const input = organizationUpdateSchema.parse(rawInput);

  if (!isSupabaseConfigured) return { id: orgId, ...input };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      ...(input.name    !== undefined && { name: input.name }),
      ...(input.slug    !== undefined && { slug: input.slug }),
      ...(input.tier    !== undefined && { subscription_tier: input.tier }),
      ...(input.branding!== undefined && { branding: input.branding }),
      ...(input.quotas  !== undefined && { quotas: input.quotas }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ─── Member Management ────────────────────────────────────────────────────────

export async function listMembers(orgId: string) {
  if (!isSupabaseConfigured) {
    return [
      { id: "mem_1", user_id: "usr_demo", role: "organization_owner", joined_at: new Date().toISOString(),
        profiles: { email: "admin@kenuxa.io", full_name: "Demo Admin" } },
    ];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, joined_at, profiles(email, full_name, avatar_url)")
    .eq("organization_id", orgId)
    .order("joined_at");

  if (error) throw error;
  return data;
}

export async function inviteMember(
  invitedBy: string,
  rawInput: z.input<typeof inviteMemberSchema>,
) {
  const input = inviteMemberSchema.parse(rawInput);

  if (!isSupabaseConfigured) {
    return { invited: true, email: input.email, role: input.role };
  }

  const supabase = createSupabaseAdminClient();

  // Find user by email
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === input.email);

  if (!user) {
    // Invite via Supabase Auth (they'll get a magic link)
    await supabase.auth.admin.inviteUserByEmail(input.email);
    return { invited: true, email: input.email, role: input.role, pending: true };
  }

  // Add directly if user exists
  const { data, error } = await supabase
    .from("organization_members")
    .upsert({
      organization_id: input.organizationId,
      user_id:         user.id,
      role:            input.role as Role,
      invited_by:      invitedBy,
    }, { onConflict: "organization_id,user_id", ignoreDuplicates: false })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMemberRole(
  rawInput: z.input<typeof updateMemberRoleSchema>,
) {
  const input = updateMemberRoleSchema.parse(rawInput);

  if (!isSupabaseConfigured) return { updated: true, role: input.role };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organization_members")
    .update({ role: input.role as Role })
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeMember(orgId: string, userId: string) {
  if (!isSupabaseConfigured) return { removed: true };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", userId);

  if (error) throw error;
  return { removed: true };
}
