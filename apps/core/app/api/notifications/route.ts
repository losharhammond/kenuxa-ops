/**
 * KENUXA CORE — Notifications API
 *
 * GET    /api/notifications?action=list&limit=30      — list notifications
 * GET    /api/notifications?action=unread             — unread count
 * GET    /api/notifications?action=stats              — notification stats
 * POST   /api/notifications  { action: "create" }    — create notification
 * POST   /api/notifications  { action: "broadcast" } — broadcast to org
 * PATCH  /api/notifications?id=:id                   — mark as read
 * PATCH  /api/notifications  (no id = mark all read)
 * DELETE /api/notifications?id=:id                   — delete notification
 */

import { NextRequest } from "next/server";
import { ok, created, problem, getApiContext } from "@/lib/api";
import {
  listNotifications,
  getUnreadCount,
  getNotificationStats,
  createNotification,
  broadcastToOrg,
  markAsRead,
  deleteNotification,
  createNotificationSchema,
  broadcastSchema,
} from "@/lib/notifications/service";

export async function GET(request: NextRequest) {
  const ctx    = await getApiContext(request);
  const params = request.nextUrl.searchParams;
  const action = params.get("action") ?? "list";

  if (action === "list") {
    const limit     = Number(params.get("limit") ?? 30);
    const onlyUnread = params.get("unread") === "true";
    return ok(await listNotifications(ctx.userId, limit, onlyUnread));
  }

  if (action === "unread") {
    return ok(await getUnreadCount(ctx.userId));
  }

  if (action === "stats") {
    return ok(await getNotificationStats(ctx.userId));
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function POST(request: NextRequest) {
  const ctx  = await getApiContext(request);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action, ...rest } = body;

  if (action === "create" || !action) {
    const n = await createNotification(createNotificationSchema.parse({
      ...rest,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
    }));
    return created(n);
  }

  if (action === "broadcast") {
    const orgId = ctx.organizationId ?? (rest.organizationId as string);
    if (!orgId) return problem("Organization context required", 400);
    const result = await broadcastToOrg(broadcastSchema.parse({ ...rest, organizationId: orgId }));
    return ok(result);
  }

  return problem(`Unknown action: ${action}`, 400);
}

export async function PATCH(request: NextRequest) {
  const ctx = await getApiContext(request);
  const id  = request.nextUrl.searchParams.get("id") ?? undefined;
  return ok(await markAsRead(ctx.userId, id));
}

export async function DELETE(request: NextRequest) {
  const ctx = await getApiContext(request);
  const id  = request.nextUrl.searchParams.get("id");
  if (!id) return problem("Notification ID required", 400);
  return ok(await deleteNotification(ctx.userId, id));
}
