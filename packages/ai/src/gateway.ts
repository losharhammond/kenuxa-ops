/**
 * KENUXA AI Gateway
 * ─────────────────────────────────────────────────────────────────
 * All AI requests from any KENUXA app route through this gateway.
 *
 * Features:
 *  • Multi-provider with automatic fallback chain
 *  • App-isolated API keys (separate Groq keys per app)
 *  • Tier-based model routing (fast / balanced / powerful)
 *  • Cost & latency tracking
 *  • Retry with exponential backoff
 *  • Provider health tracking
 */

import type { KenuxaApp, AIModelTier, AIProvider } from '@kenuxa/shared-types'
import type {
  ProviderAdapter, ProviderConfig,
  AIChatRequest, AIChatResponse,
  AIEmbedRequest, AIEmbedResponse,
  ChatCallOptions,
} from './types'
import { createGroqAdapter }       from './providers/groq'
import { createOpenAIAdapter }     from './providers/openai'
import { createAnthropicAdapter }  from './providers/anthropic'
import {
  createTogetherAdapter,
  createOpenRouterAdapter,
  createDeepSeekAdapter,
  createMistralAdapter,
} from './providers/together'

// ─── Provider health tracking (in-memory per process) ────────
const providerErrors: Map<AIProvider, number> = new Map()
const providerLastError: Map<AIProvider, number> = new Map()
const ERROR_COOLDOWN_MS = 60_000   // 1 minute cooldown after errors

// ─── Default model mapping per tier ──────────────────────────
const TIER_MODELS: Record<AIModelTier, Record<AIProvider, string>> = {
  fast: {
    groq:       'llama-3.1-8b-instant',
    openai:     'gpt-4o-mini',
    anthropic:  'claude-haiku-4-5-20251001',
    together:   'meta-llama/Llama-3-8b-chat-hf',
    openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
    deepseek:   'deepseek-chat',
    mistral:    'mistral-small-latest',
    gemini:     'gemini-1.5-flash',
    huggingface:'',
    ollama:     'llama3.1:8b',
    stub:       'stub',
  },
  balanced: {
    groq:       'llama-3.3-70b-versatile',
    openai:     'gpt-4o-mini',
    anthropic:  'claude-sonnet-4-6',
    together:   'meta-llama/Llama-3-70b-chat-hf',
    openrouter: 'meta-llama/llama-3.3-70b-instruct',
    deepseek:   'deepseek-chat',
    mistral:    'mistral-medium-latest',
    gemini:     'gemini-1.5-pro',
    huggingface:'',
    ollama:     'llama3.3:70b',
    stub:       'stub',
  },
  powerful: {
    groq:       'llama-3.3-70b-versatile',
    openai:     'gpt-4o',
    anthropic:  'claude-opus-4-7',
    together:   'meta-llama/Llama-3-70b-chat-hf',
    openrouter: 'anthropic/claude-opus-4',
    deepseek:   'deepseek-reasoner',
    mistral:    'mistral-large-latest',
    gemini:     'gemini-2.5-pro',
    huggingface:'',
    ollama:     'llama3.3:70b',
    stub:       'stub',
  },
  embed: {
    groq:       '',
    openai:     'text-embedding-3-small',
    anthropic:  '',
    together:   'togethercomputer/m2-bert-80M-8k-retrieval',
    openrouter: '',
    deepseek:   '',
    mistral:    'mistral-embed',
    gemini:     'text-embedding-004',
    huggingface:'sentence-transformers/all-MiniLM-L6-v2',
    ollama:     'nomic-embed-text',
    stub:       'stub',
  },
}

export interface GatewayConfig {
  /** Separate Groq keys per KENUXA app (for isolated rate limits) */
  groqKeys:       Partial<Record<KenuxaApp, string>>
  openaiKey?:     string
  anthropicKey?:  string
  togetherKey?:   string
  openrouterKey?: string
  deepseekKey?:   string
  mistralKey?:    string
  /** Provider priority order — gateway tries these in order */
  providerOrder?: AIProvider[]
}

export class KenuxaAIGateway {
  private adapters: Map<string, ProviderAdapter> = new Map()
  private config: GatewayConfig

  constructor(config: GatewayConfig) {
    this.config = config
    this.registerAdapters()
  }

  private registerAdapters() {
    const c = this.config

    // Groq — one adapter per app key (isolated rate limits)
    for (const [app, key] of Object.entries(c.groqKeys)) {
      if (key) this.adapters.set(`groq:${app}`, createGroqAdapter(key))
    }
    // Also a default groq adapter using core key
    if (c.groqKeys.core) {
      this.adapters.set('groq', createGroqAdapter(c.groqKeys.core))
    }

    if (c.openaiKey)     this.adapters.set('openai',     createOpenAIAdapter(c.openaiKey))
    if (c.anthropicKey)  this.adapters.set('anthropic',  createAnthropicAdapter(c.anthropicKey))
    if (c.togetherKey)   this.adapters.set('together',   createTogetherAdapter(c.togetherKey))
    if (c.openrouterKey) this.adapters.set('openrouter', createOpenRouterAdapter(c.openrouterKey))
    if (c.deepseekKey)   this.adapters.set('deepseek',   createDeepSeekAdapter(c.deepseekKey))
    if (c.mistralKey)    this.adapters.set('mistral',    createMistralAdapter(c.mistralKey))

    // Stub adapter always available (for dev/test)
    this.adapters.set('stub', {
      name: 'stub',
      async chat(messages, opts) {
        const last = messages.at(-1)?.content ?? ''
        return {
          content:           `[STUB ${opts.model}] Echo: ${last.slice(0, 100)}`,
          prompt_tokens:     Math.ceil(last.length / 4),
          completion_tokens: 20,
          latency_ms:        5,
        }
      },
    })
  }

  /** Get the best available adapter for a given app + tier */
  private resolveAdapter(app: KenuxaApp, tier: AIModelTier): { adapter: ProviderAdapter; model: string } {
    const order: AIProvider[] = this.config.providerOrder ?? [
      'groq', 'openai', 'anthropic', 'together', 'openrouter', 'deepseek', 'mistral', 'stub'
    ]

    for (const provider of order) {
      // Skip if too many recent errors
      const errs = providerErrors.get(provider) ?? 0
      const lastErr = providerLastError.get(provider) ?? 0
      if (errs >= 3 && Date.now() - lastErr < ERROR_COOLDOWN_MS) continue

      // Try app-specific key first (e.g. groq:reach)
      const appKey = `${provider}:${app}`
      const adapter = this.adapters.get(appKey) ?? this.adapters.get(provider)
      if (!adapter) continue

      const model = TIER_MODELS[tier]?.[provider]
      if (!model) continue

      return { adapter, model }
    }

    // Fallback: stub
    return { adapter: this.adapters.get('stub')!, model: 'stub' }
  }

  /** Main chat interface — all KENUXA apps call this */
  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const tier = req.tier ?? 'balanced'
    const { adapter, model } = this.resolveAdapter(req.app, tier)

    const opts: ChatCallOptions = {
      model,
      temperature: req.temperature ?? 0.2,
      maxTokens:   req.maxTokens,
      stream:      req.stream,
    }

    const requestId = `${req.app}_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Retry loop with exponential backoff
    let lastError: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await adapter.chat(req.messages, opts)

        // Reset error count on success
        providerErrors.set(adapter.name, 0)

        const estimatedCost = estimateCost(adapter.name, model, result.prompt_tokens, result.completion_tokens)

        return {
          content:  result.content,
          provider: adapter.name,
          model,
          usage: {
            prompt_tokens:      result.prompt_tokens,
            completion_tokens:  result.completion_tokens,
            total_tokens:       result.prompt_tokens + result.completion_tokens,
            estimated_cost_usd: estimatedCost,
          },
          latency_ms: result.latency_ms,
          requestId,
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        providerErrors.set(adapter.name, (providerErrors.get(adapter.name) ?? 0) + 1)
        providerLastError.set(adapter.name, Date.now())

        // Try the next provider in the fallback chain
        if (attempt < 2) {
          const fallback = this.resolveAdapter(req.app, tier)
          if (fallback.adapter.name !== adapter.name) {
            // Got a different adapter — use it
            const res = await fallback.adapter.chat(req.messages, { ...opts, model: fallback.model })
            return {
              content:  res.content,
              provider: fallback.adapter.name,
              model:    fallback.model,
              usage: {
                prompt_tokens:     res.prompt_tokens,
                completion_tokens: res.completion_tokens,
                total_tokens:      res.prompt_tokens + res.completion_tokens,
                estimated_cost_usd: estimateCost(fallback.adapter.name, fallback.model, res.prompt_tokens, res.completion_tokens),
              },
              latency_ms: res.latency_ms,
              requestId,
            }
          }
          await sleep(200 * 2 ** attempt)
        }
      }
    }

    throw lastError ?? new Error('AI gateway: all providers failed')
  }

  /** Embedding interface */
  async embed(req: AIEmbedRequest): Promise<AIEmbedResponse> {
    // Try OpenAI first for embeddings, then Together, then stub
    const embedOrder: AIProvider[] = ['openai', 'together', 'mistral', 'stub']
    const texts = Array.isArray(req.text) ? req.text : [req.text]

    for (const provider of embedOrder) {
      const adapter = this.adapters.get(provider)
      if (!adapter?.embed) continue
      try {
        const embeddings = await adapter.embed(texts)
        return {
          embeddings,
          model: TIER_MODELS.embed[provider] ?? 'embed',
          usage: { total_tokens: texts.join(' ').length / 4 | 0 },
        }
      } catch { /* try next */ }
    }

    // Stub embeddings (384-dim zeros — for dev only)
    return {
      embeddings: texts.map(() => Array.from({ length: 384 }, () => 0)),
      model:      'stub-embed',
      usage:      { total_tokens: 0 },
    }
  }
}

// ─── Utilities ────────────────────────────────────────────────

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'groq:llama-3.1-8b-instant':     { input: 0.00005, output: 0.00008 },
  'groq:llama-3.3-70b-versatile':  { input: 0.00059, output: 0.00079 },
  'openai:gpt-4o-mini':            { input: 0.00015, output: 0.00060 },
  'openai:gpt-4o':                 { input: 0.00250, output: 0.01000 },
  'anthropic:claude-haiku-4-5-20251001': { input: 0.00025, output: 0.00125 },
  'anthropic:claude-sonnet-4-6':   { input: 0.00300, output: 0.01500 },
  'anthropic:claude-opus-4-7':     { input: 0.01500, output: 0.07500 },
}

function estimateCost(provider: AIProvider, model: string, inputTokens: number, outputTokens: number): number {
  const key = `${provider}:${model}`
  const rates = COST_PER_1K[key] ?? { input: 0.001, output: 0.002 }
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Singleton factory ────────────────────────────────────────

let _gateway: KenuxaAIGateway | null = null

export function getAIGateway(config?: GatewayConfig): KenuxaAIGateway {
  if (!_gateway) {
    if (!config) throw new Error('AI Gateway not initialized — call getAIGateway(config) once at startup')
    _gateway = new KenuxaAIGateway(config)
  }
  return _gateway
}

export function initAIGateway(config: GatewayConfig): KenuxaAIGateway {
  _gateway = new KenuxaAIGateway(config)
  return _gateway
}
