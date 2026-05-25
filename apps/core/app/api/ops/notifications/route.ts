/**
 * KENUXA OPS — Notifications Bridge
 *
 * POST /api/ops/notifications  — send notification from OPS to user
 * GET  /api/ops/notifications  — list notifications for a user
 */

import { NextRequest } from "next/server";
import { ok, created, problem } from "@/lib/api";
import { createNotification, listNotifications, createNotificationSchema } from "@/lib/notifications/service";

export async function POST(request: NextRequest) {
  const body  = await request.json().catch(() => ({})) as Record<string, unknown>;

  const notification = await createNotification(createNotificationSchema.parse({
    ...body,
    metadata: { ...(body.metadata as Record<string, unknown> ?? {}), source: "ops" },
  }));

  return created(notification);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get("userId");
  const limit  = Number(params.get("limit") ?? 20);

  if (!userId) return problem("userId required", 400);
  return ok(await listNotifications(userId, limit));
}
