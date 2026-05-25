import type { ProviderAdapter, ChatCallOptions, ChatCallResult } from '../types'
import type { AIMessage } from '@kenuxa/shared-types'

/** Together AI + OpenRouter both use the OpenAI-compatible API format */
export function createOpenAICompatAdapter(
  name: 'together' | 'openrouter' | 'deepseek' | 'mistral',
  apiKey: string,
  baseUrl: string,
  extraHeaders: Record<string, string> = {},
): ProviderAdapter {
  return {
    name,

    async chat(messages: AIMessage[], options: ChatCallOptions): Promise<ChatCallResult> {
      const start = Date.now()

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify({
          model:       options.model,
          messages,
          temperature: options.temperature,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`${name} error ${response.status}: ${err}`)
      }

      const json = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage: { prompt_tokens: number; completion_tokens: number }
      }

      return {
        content:           json.choices[0]?.message.content ?? '',
        prompt_tokens:     json.usage?.prompt_tokens     ?? 0,
        completion_tokens: json.usage?.completion_tokens ?? 0,
        latency_ms:        Date.now() - start,
      }
    },
  }
}

export const createTogetherAdapter  = (key: string) =>
  createOpenAICompatAdapter('together',    key, 'https://api.together.xyz/v1')

export const createOpenRouterAdapter = (key: string) =>
  createOpenAICompatAdapter('openrouter',  key, 'https://openrouter.ai/api/v1', {
    'HTTP-Referer': 'https://kenuxa.com',
    'X-Title':      'KENUXA',
  })

export const createDeepSeekAdapter   = (key: string) =>
  createOpenAICompatAdapter('deepseek',    key, 'https://api.deepseek.com')

export const createMistralAdapter    = (key: string) =>
  createOpenAICompatAdapter('mistral',     key, 'https://api.mistral.ai/v1')
