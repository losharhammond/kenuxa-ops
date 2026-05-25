/**
 * @kenuxa/sdk — Events Module
 *
 * Publish and subscribe to events via KENUXA CORE's event bus.
 *
 * @example
 * ```ts
 * import { EventsClient } from "@kenuxa/sdk/events";
 *
 * const events = new EventsClient({ coreUrl: "https://core.kenuxa.io", token: "...", organizationId: "org-id" });
 *
 * // Publish
 * await events.publish("user.signed_up", "reach", { userId: "u123" });
 *
 * // Subscribe
 * await events.subscribe("user.*", "webhook", { url: "https://my-app.com/hooks" });
 *
 * // List
 * const { data } = await events.list({ status: "queued" });
 * ```
 */

import { KenuxaClient } from "./client.js";
import type { KenuxaConfig, KenuxaResponse, Event } from "./types.js";

export interface SubscribeOptions {
  url?:      string;
  headers?:  Record<string, string>;
  metadata?: Record<string, unknown>;
}

export class EventsClient extends KenuxaClient {
  private organizationId: string;

  constructor(config: KenuxaConfig & { organizationId: string }) {
    super(config);
    this.organizationId = config.organizationId;
  }

  async publish(
    eventName: string,
    source: string,
    payload: Record<string, unknown> = {},
    idempotencyKey?: string,
  ): Promise<KenuxaResponse<Event>> {
    return this.post<Event>("/api/events", {
      action:         "publish",
      event:          eventName,
      source,
      organizationId: this.organizationId,
      payload,
      idempotencyKey,
    });
  }

  async list(options: { status?: string; limit?: number } = {}): Promise<KenuxaResponse<Event[]>> {
    return this.get<Event[]>("/api/events", {
      action:         "list",
      organizationId: this.organizationId,
      ...options,
    });
  }

  async getStats(days = 1): Promise<KenuxaResponse<unknown>> {
    return this.get("/api/events", { action: "stats", days, organizationId: this.organizationId });
  }

  async subscribe(
    eventPattern: string,
    targetType: "webhook" | "workflow" | "realtime",
    targetConfig: SubscribeOptions = {},
  ): Promise<KenuxaResponse<unknown>> {
    return this.post("/api/events", {
      action:         "subscribe",
      organizationId: this.organizationId,
      eventPattern,
      targetType,
      targetConfig,
    });
  }

  async listSubscriptions(): Promise<KenuxaResponse<unknown>> {
    return this.get("/api/events", { action: "subscriptions", organizationId: this.organizationId });
  }

  async deleteSubscription(id: string): Promise<KenuxaResponse<unknown>> {
    return this.delete("/api/events", { id, orgId: this.organizationId });
  }

  // ─── OPS bridge ──────────────────────────────────────────────
  /** Publish event via OPS bridge (for KENUXA OPS integration) */
  async publishFromOps(
    eventName: string,
    payload: Record<string, unknown> = {},
  ): Promise<KenuxaResponse<Event>> {
    return this.post<Event>("/api/ops/events", {
      event:          eventName,
      source:         "ops",
      organizationId: this.organizationId,
      payload,
    });
  }
}
