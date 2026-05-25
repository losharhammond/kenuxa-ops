import type {
  AIProvider, AIModelTier, AIChatRequest, AIChatResponse,
  AIEmbedRequest, AIEmbedResponse, ProviderStatus, GatewayRouteDecision,
} from '@kenuxa/shared-types'

export interface ProviderConfig {
  provider:  AIProvider
  apiKey:    string
  baseUrl?:  string
  /** Map from tier to model string */
  models:    Partial<Record<AIModelTier, string>>
  priority:  number   // lower = higher priority
  enabled:   boolean
}

export interface ProviderAdapter {
  name:    AIProvider
  chat(messages: AIChatRequest['messages'], options: ChatCallOptions): Promise<ChatCallResult>
  embed?(texts: string[]): Promise<number[][]>
}

export interface ChatCallOptions {
  model:        string
  temperature:  number
  maxTokens?:   number
  stream?:      boolean
}

export interface ChatCallResult {
  content:           string
  prompt_tokens:     number
  completion_tokens: number
  latency_ms:        number
}

export type {
  AIChatRequest, AIChatResponse,
  AIEmbedRequest, AIEmbedResponse,
  ProviderStatus, GatewayRouteDecision,
}
