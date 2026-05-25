/**
 * @kenuxa/sdk — Shared Types
 */

export interface KenuxaConfig {
  /** KENUXA CORE base URL */
  coreUrl:       string;
  /** API key or JWT token */
  apiKey?:       string;
  token?:        string;
  /** Organization context */
  organizationId?: string;
  /** Product app name */
  app?:          "reach" | "ops" | "zuria" | "academy" | "core";
  /** Request timeout in ms */
  timeout?:      number;
}

export interface ApiResponse<T> {
  data:    T;
  error?:  never;
}

export interface ApiError {
  data?:   never;
  error: {
    message: string;
    details?: unknown;
  };
}

export type KenuxaResponse<T> = ApiResponse<T> | ApiError;

export interface WalletBalance {
  balance:        number;
  lifetimeEarned: number;
  lifetimeSpent:  number;
}

export interface WalletTransaction {
  id:          string;
  type:        string;
  amount:      number;
  description: string;
  created_at:  string;
}

export interface AIRequest {
  prompt:       string;
  systemPrompt?: string;
  task:         string;
  tier?:        "fast" | "balanced" | "powerful";
  provider?:    "groq" | "openai" | "anthropic" | "openrouter" | "gemini" | "auto";
  temperature?: number;
  maxTokens?:   number;
  metadata?:    Record<string, unknown>;
}

export interface AIResponse {
  output:             string;
  provider:           string;
  model:              string;
  prompt_tokens:      number;
  completion_tokens:  number;
  latency_ms:         number;
  estimated_cost_usd: number;
}

export interface MemoryRecord {
  id:              string;
  organizationId:  string;
  type:            string;
  content:         string;
  title?:          string;
  tags?:           string[];
  created_at:      string;
}

export interface Event {
  id:              string;
  event:           string;
  source:          string;
  organizationId:  string;
  payload:         Record<string, unknown>;
  status:          string;
  created_at:      string;
}

export interface Notification {
  id:         string;
  type:       string;
  title:      string;
  body:       string;
  is_read:    boolean;
  created_at: string;
}
