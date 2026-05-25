/**
 * @kenuxa/sdk v2.0.0
 *
 * The official KENUXA Ecosystem SDK.
 * Provides unified access to KENUXA CORE services from any product.
 *
 * @example
 * ```ts
 * import { createKenuxa } from "@kenuxa/sdk";
 *
 * const kenuxa = createKenuxa({
 *   coreUrl: "https://core.kenuxa.io",
 *   token: "...",
 *   app: "reach",
 *   organizationId: "org-id",
 * });
 *
 * // Use any service
 * const { data } = await kenuxa.memory.search("user preferences");
 * const balance  = await kenuxa.wallet.getBalance();
 * const result   = await kenuxa.ai.fast("Summarize this...", "summarize");
 * ```
 */

export { AuthClient }   from "./auth.js";
export { WalletClient } from "./wallet.js";
export { AIClient }     from "./ai.js";
export { EventsClient } from "./events.js";
export { MemoryClient } from "./memory.js";
export { KenuxaClient } from "./client.js";

export type * from "./types.js";

import { AuthClient }   from "./auth.js";
import { WalletClient } from "./wallet.js";
import { AIClient }     from "./ai.js";
import { EventsClient } from "./events.js";
import { MemoryClient } from "./memory.js";
import type { KenuxaConfig } from "./types.js";

// ─── Factory ─────────────────────────────────────────────────────────────────

export interface KenuxaSDK {
  /** Authentication — login, signup, token management */
  auth:   AuthClient;
  /** AI Gateway — multi-provider completions (Groq, OpenRouter, Gemini, Ollama) */
  ai:     AIClient;
  /** KENUX Wallet — token economy, credits, transfers */
  wallet: WalletClient;
  /** Event Bus — publish, subscribe, list events */
  events: EventsClient;
  /** Memory Engine — semantic search, store, retrieve */
  memory: MemoryClient;
  /** The config used to initialize this SDK instance */
  config: KenuxaConfig & { organizationId: string };
}

/**
 * Create a fully-initialized KENUXA SDK instance.
 *
 * @param config - Connection config: coreUrl, token, app, organizationId
 * @returns Object with `auth`, `ai`, `wallet`, `events`, `memory` clients
 */
export function createKenuxa(
  config: KenuxaConfig & { organizationId: string },
): KenuxaSDK {
  return {
    auth:   new AuthClient(config),
    ai:     new AIClient(config),
    wallet: new WalletClient(config),
    events: new EventsClient(config),
    memory: new MemoryClient(config),
    config,
  };
}

export const SDK_VERSION = "2.0.0";
