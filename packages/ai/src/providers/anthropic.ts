import type { ProviderAdapter, ChatCallOptions, ChatCallResult } from '../types'
import type { AIMessage } from '@kenuxa/shared-types'

export function createAnthropicAdapter(apiKey: string): ProviderAdapter {
  return {
    name: 'anthropic',

    async chat(messages: AIMessage[], options: ChatCallOptions): Promise<ChatCallResult> {
      const start = Date.now()

      // Anthropic separates system prompt from human/assistant turns
      const systemMsg = messages.find(m => m.role === 'system')?.content
      const turns     = messages.filter(m => m.role !== 'system')

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type':      'application/json',
        },
        body: JSON.stringify({
          model:      options.model,
          max_tokens: options.maxTokens ?? 2048,
          ...(systemMsg ? { system: systemMsg } : {}),
          messages:   turns.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Anthropic error ${response.status}: ${err}`)
      }

      const json = await response.json() as {
        content: Array<{ type: string; text: string }>
        usage: { input_tokens: number; output_tokens: number }
      }

      const text = json.content.filter(c => c.type === 'text').map(c => c.text).join('')

      return {
        content:           text,
        prompt_tokens:     json.usage?.input_tokens  ?? 0,
        completion_tokens: json.usage?.output_tokens ?? 0,
        latency_ms:        Date.now() - start,
      }
    },
  }
}
