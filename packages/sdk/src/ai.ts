/**
 * @kenuxa/sdk — AI Module
 *
 * Access KENUXA CORE's multi-provider AI gateway from any product.
 * Groq-first with automatic OpenRouter, OpenAI, Anthropic failover.
 *
 * @example
 * ```ts
 * import { AIClient } from "@kenuxa/sdk/ai";
 *
 * const ai = new AIClient({ coreUrl: "https://core.kenuxa.io", token: "...", app: "reach", organizationId: "org-id" });
 * const result = await ai.complete({ task: "summarize", prompt: "Summarize this article..." });
 * console.log(result.data.output);
 * ```
 */

import { KenuxaClient } from "./client.js";
import type { KenuxaConfig, KenuxaResponse, AIRequest, AIResponse } from "./types.js";

export class AIClient extends KenuxaClient {
  private organizationId: string;

  constructor(config: KenuxaConfig & { organizationId: string }) {
    super(config);
    this.organizationId = config.organizationId;
  }

  /** Run an AI completion */
  async complete(req: AIRequest): Promise<KenuxaResponse<AIResponse>> {
    return this.post<AIResponse>("/api/ai", {
      ...req,
      app:            this.config.app ?? "core",
      organizationId: this.organizationId,
    });
  }

  /** Convenience: fast tier (Groq Llama 8B) */
  async fast(prompt: string, task: string, systemPrompt?: string): Promise<KenuxaResponse<AIResponse>> {
    return this.complete({ prompt, task, tier: "fast", systemPrompt });
  }

  /** Convenience: balanced tier (Groq Llama 70B) */
  async balanced(prompt: string, task: string, systemPrompt?: string): Promise<KenuxaResponse<AIResponse>> {
    return this.complete({ prompt, task, tier: "balanced", systemPrompt });
  }

  /** Convenience: powerful tier (OpenAI GPT-4o or Anthropic Claude Opus) */
  async powerful(prompt: string, task: string, systemPrompt?: string): Promise<KenuxaResponse<AIResponse>> {
    return this.complete({ prompt, task, tier: "powerful", systemPrompt });
  }

  /** Get provider status and availability */
  async getProviders(): Promise<KenuxaResponse<{ providers: Array<{ provider: string; configured: boolean; models: string[] }> }>> {
    return this.get("/api/ai", { action: "providers" });
  }

  /** Get recent AI usage stats */
  async getUsageStats(days = 7): Promise<KenuxaResponse<unknown>> {
    return this.get("/api/analytics", { action: "ai", days });
  }
}
