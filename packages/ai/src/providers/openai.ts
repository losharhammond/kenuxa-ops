import type { ProviderAdapter, ChatCallOptions, ChatCallResult } from '../types'
import type { AIMessage } from '@kenuxa/shared-types'

export function createOpenAIAdapter(apiKey: string, baseUrl = 'https://api.openai.com/v1'): ProviderAdapter {
  return {
    name: 'openai',

    async chat(messages: AIMessage[], options: ChatCallOptions): Promise<ChatCallResult> {
      const start = Date.now()

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
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
        throw new Error(`OpenAI error ${response.status}: ${err}`)
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

    async embed(texts: string[]): Promise<number[][]> {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`OpenAI embed error ${response.status}: ${err}`)
      }

      const json = await response.json() as {
        data: Array<{ embedding: number[] }>
      }

      return json.data.map(d => d.embedding)
    },
  }
}
