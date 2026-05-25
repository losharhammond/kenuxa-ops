/**
 * @kenuxa/sdk — Memory Module
 *
 * Store and retrieve memory records from KENUXA CORE's shared memory engine.
 * Supports semantic search, tagging, and multi-product shared context.
 *
 * @example
 * ```ts
 * import { MemoryClient } from "@kenuxa/sdk/memory";
 *
 * const memory = new MemoryClient({ coreUrl: "https://core.kenuxa.io", token: "...", organizationId: "org-id" });
 *
 * // Store
 * await memory.store({ content: "User prefers dark mode", type: "user" });
 *
 * // Search
 * const results = await memory.search("user preferences");
 * ```
 */

import { KenuxaClient } from "./client.js";
import type { KenuxaConfig, KenuxaResponse, MemoryRecord } from "./types.js";

export interface StoreMemoryRequest {
  content:      string;
  type?:        "episodic" | "semantic" | "procedural" | "working" | "user" | "ai_interaction";
  title?:       string;
  tags?:        string[];
  product?:     string;
  source?:      string;
  expiresAt?:   string;
  metadata?:    Record<string, unknown>;
}

export interface SearchOptions {
  limit?:   number;
  type?:    string;
  product?: string;
}

export class MemoryClient extends KenuxaClient {
  private organizationId: string;

  constructor(config: KenuxaConfig & { organizationId: string }) {
    super(config);
    this.organizationId = config.organizationId;
  }

  async store(req: StoreMemoryRequest): Promise<KenuxaResponse<MemoryRecord>> {
    return this.post<MemoryRecord>("/api/memory", {
      ...req,
      organizationId: this.organizationId,
    });
  }

  async search(query: string, options: SearchOptions = {}): Promise<KenuxaResponse<MemoryRecord[]>> {
    return this.get<MemoryRecord[]>("/api/memory", {
      action:         "search",
      organizationId: this.organizationId,
      q:              query,
      ...options,
    });
  }

  async list(options: { type?: string; product?: string; limit?: number; offset?: number } = {}): Promise<KenuxaResponse<MemoryRecord[]>> {
    return this.get<MemoryRecord[]>("/api/memory", {
      action:         "list",
      organizationId: this.organizationId,
      ...options,
    });
  }

  async get(id: string): Promise<KenuxaResponse<MemoryRecord>> {
    return this.get<MemoryRecord>("/api/memory", { action: "get", id, organizationId: this.organizationId });
  }

  async getStats(): Promise<KenuxaResponse<{ total: number; vectorized: number; by_type: Record<string, number> }>> {
    return this.get("/api/memory", { action: "stats", organizationId: this.organizationId });
  }

  async delete(id: string): Promise<KenuxaResponse<{ deleted: boolean }>> {
    return this.delete("/api/memory", { id, organizationId: this.organizationId });
  }

  // ─── OPS bridge ──────────────────────────────────────────────
  /** Search memory via OPS bridge */
  async searchForOps(query: string, options: SearchOptions = {}): Promise<KenuxaResponse<MemoryRecord[]>> {
    return this.get<MemoryRecord[]>("/api/ops/memory", {
      orgId: this.organizationId,
      q:     query,
      ...options,
    });
  }
}
