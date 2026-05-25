/**
 * KENUXA CORE — Notifications Service
 *
 * Handles in-app notifications for users and organizations.
 * Supports realtime delivery via Supabase realtime + webhook push.
 */

import { z } from "zod";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import type { NotificationType } from "@/lib/types";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const createNotificationSchema = z.object({
  organizationId: z.string().uuid().optional(),
  userId:         z.string().uuid().optional(),
  type:           z.enum(["info","success","warning","error","system","billing","security","ai","event","workflow"]).default("info"),
  title:          z.string().min(1).max(200),
  body:           z.string().min(1).max(2000),
  actionUrl:      z.string().url().optional(),
  actionLabel:    z.string().max(50).optional(),
  icon:           z.string().optional(),
  expiresAt:      z.string().datetime().optional(),
  metadata:       z.record(z.unknown()).default({}),
});

export const broadcastSchema = createNotificationSchema.extend({
  organizationId: z.string().uuid(),
});

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS = [
  { id: "n1", type: "success", title: "Build Successful",     body: "KENUXA CORE compiled with 0 errors.", is_read: false, created_at: new Date(Date.now() - 300_000).toISOString() },
  { id: "n2", type: "ai",      title: "AI Provider Upgraded", body: "Groq Llama 3.3 70B is now available.", is_read: false, created_at: new Date(Date.now() - 3600_000).toISOString() },
  { id: "n3", type: "billing", title: "KENUX Balance Low",    body: "Your KENUX balance is below 500. Top up to continue.", is_read: true, created_at: new Date(Date.now() - 86400_000).toISOString() },
  { id: "n4", type: "system",  title: "New Member Joined",    body: "alex@kenuxa.io accepted your invitation.", is_read: true, created_at: new Date(Date.now() - 172800_000).toISOString() },
];

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createNotification(rawInput: z.input<typeof createNotificationSchema>) {
  const input = createNotificationSchema.parse(rawInput);
  if (!isSupabaseConfigured) {
    return { id: `n_${Date.now()}`, ...input, is_read: false, created_at: new Date().toISOString() };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      organization_id: input.organizationId,
      user_id:         input.userId,
      type:            input.type as NotificationType,
      title:           input.title,
      body:            input.body,
      action_url:      input.actionUrl,
      action_label:    input.actionLabel,
      icon:            input.icon,
      expires_at:      input.expiresAt,
      metadata:        input.metadata,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Broadcast a notification to all members of an organization */
export async function broadcastToOrg(rawInput: z.input<typeof broadcastSchema>) {
  const input = broadcastSchema.parse(rawInput);
  if (!isSupabaseConfigured) return { broadcast: true, count: 1 };

  const supabase = createSupabaseAdminClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId);

  if (!members?.length) return { broadcast: true, count: 0 };

  const notifications = members.map(m => ({
    organization_id: input.organizationId,
    user_id:         m.user_id,
    type:            input.type as NotificationType,
    title:           input.title,
    body:            input.body,
    action_url:      input.actionUrl,
    action_label:    input.actionLabel,
    icon:            input.icon,
    expires_at:      input.expiresAt,
    metadata:        input.metadata,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) throw error;
  return { broadcast: true, count: members.length };
}

// ─── List + Read ──────────────────────────────────────────────────────────────

export async function listNotifications(userId: string, limit = 30, onlyUnread = false) {
  if (!isSupabaseConfigured) {
    return onlyUnread
      ? MOCK_NOTIFICATIONS.filter(n => !n.is_read)
      : MOCK_NOTIFICATIONS;
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (onlyUnread) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getUnreadCount(userId: string) {
  if (!isSupabaseConfigured) return { count: 2 };

  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return { count: count ?? 0 };
}

export async function markAsRead(userId: string, notificationId?: string) {
  if (!isSupabaseConfigured) return { updated: true };

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (notificationId) query = query.eq("id", notificationId);

  const { error } = await query;
  if (error) throw error;
  return { updated: true };
}

export async function deleteNotification(userId: string, notificationId: string) {
  if (!isSupabaseConfigured) return { deleted: true };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
  return { deleted: true };
}

export async function getNotificationStats(userId: string) {
  if (!isSupabaseConfigured) {
    return { total: 4, unread: 2, by_type: { success: 1, ai: 1, billing: 1, system: 1 } };
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("notifications")
    .select("type, is_read")
    .eq("user_id", userId);

  const byType: Record<string, number> = {};
  let unread = 0;
  for (const n of data ?? []) {
    byType[n.type] = (byType[n.type] ?? 0) + 1;
    if (!n.is_read) unread++;
  }

  return { total: data?.length ?? 0, unread, by_type: byType };
}

// ─── System Helpers (for other services) ─────────────────────────────────────

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  extras: Partial<z.input<typeof createNotificationSchema>> = {},
) {
  return createNotification({ userId, type, title, body, ...extras }).catch(() => null);
}

export async function notifyOrg(
  organizationId: string,
  type: NotificationType,
  title: string,
  body: string,
) {
  return broadcastToOrg({ organizationId, type, title, body }).catch(() => null);
}
