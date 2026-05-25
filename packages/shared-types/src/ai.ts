// ============================================================
// KENUXA Ecosystem — AI Gateway Types
// All AI requests route through KENUXA CORE AI Gateway
// ============================================================

import type { KenuxaApp } from './ecosystem'

export type AIProvider =
  | 'groq'
  | 'openai'
  | 'anthropic'
  | 'together'
  | 'openrouter'
  | 'deepseek'
  | 'mistral'
  | 'gemini'
  | 'huggingface'
  | 'ollama'
  | 'stub'

export type AICapability = 'chat' | 'embed' | 'vision' | 'audio' | 'code' | 'reasoning'

export type AIModelTier = 'fast' | 'balanced' | 'powerful' | 'embed'

/** All registered models in the KENUXA AI gateway */
export interface AIModel {
  id:           string
  provider:     AIProvider
  model:        string
  capability:   AICapability
  tier:         AIModelTier
  active:       boolean
  context_window: number
  cost_per_1k_input:  number   // USD
  cost_per_1k_output: number   // USD
  metadata:     Record<string, unknown>
}

// ─── Canonical model tiers ───────────────────────────────────
// These are the recommended models for each tier in the ecosystem
export const AI_MODELS: Record<AIModelTier, { provider: AIProvider; model: string }> = {
  fast:     { provider: 'groq',     model: 'llama-3.1-8b-instant'    },
  balanced: { provider: 'groq',     model: 'llama-3.3-70b-versatile' },
  powerful: { provider: 'groq',     model: 'llama-3.3-70b-versatile' },
  embed:    { provider: 'openai',   model: 'text-embedding-3-small'  },
} as const

// ─── AI Request / Response ──────────────────────────────────

export interface AIMessage {
  role:    'system' | 'user' | 'assistant'
  content: string
}

export interface AIChatRequest {
  app:            KenuxaApp
  organizationId: string
  task:           string
  messages:       AIMessage[]
  tier?:          AIModelTier      // defaults to 'balanced'
  provider?:      AIProvider       // override — gateway will pick if not set
  model?:         string           // override — gateway will pick if not set
  temperature?:   number           // defaults to 0.2
  maxTokens?:     number
  stream?:        boolean
  metadata?:      Record<string, unknown>
}

export interface AIChatResponse {
  content:     string
  provider:    AIProvider
  model:       string
  usage: {
    prompt_tokens:     number
    completion_tokens: number
    total_tokens:      number
    estimated_cost_usd: number
  }
  latency_ms:  number
  requestId:   string
}

export interface AIEmbedRequest {
  app:            KenuxaApp
  organizationId: string
  text:           string | string[]
  model?:         string
}

export interface AIEmbedResponse {
  embeddings:  number[][]
  model:       string
  usage: {
    total_tokens: number
  }
}

// ─── Gateway routing ─────────────────────────────────────────

export interface ProviderStatus {
  provider:       AIProvider
  available:      boolean
  rate_limited:   boolean
  error_rate:     number     // 0-1
  avg_latency_ms: number
  last_checked:   string
}

export interface GatewayRouteDecision {
  provider:  AIProvider
  model:     string
  reason:    'primary' | 'fallback' | 'cost_optimized' | 'latency_optimized'
}
