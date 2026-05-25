# KENUXA AI Gateway System

## Philosophy

All AI requests across the KENUXA ecosystem route through a single gateway managed by KENUXA CORE. This provides:

- **Cost visibility** — every token across every app is tracked
- **Provider resilience** — automatic fallback if any provider fails
- **App isolation** — separate API keys per app for independent rate limits
- **Model routing** — tier-based routing for cost/quality optimization
- **Centralized observability** — one place to monitor all AI usage

---

## Multi-Provider Architecture

```
App request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│              KENUXA CORE AI GATEWAY                   │
│                                                       │
│  Tier Router                                          │
│  ┌──────────┬──────────┬──────────┐                  │
│  │  FAST    │ BALANCED │ POWERFUL │                  │
│  │ 8b model │ 70b model│ frontier │                  │
│  └──────────┴──────────┴──────────┘                  │
│                                                       │
│  Provider Priority Chain                             │
│  1. Groq (app-specific key)                          │
│  2. OpenAI                                           │
│  3. Anthropic                                        │
│  4. Together AI                                      │
│  5. OpenRouter                                       │
│  6. DeepSeek                                         │
│  7. Mistral                                          │
│  8. Stub (dev/test fallback)                         │
│                                                       │
│  Features:                                           │
│  • Auto-failover on error                            │
│  • Exponential backoff retry                         │
│  • Provider health tracking                          │
│  • Token usage logging to ai_requests                │
│  • Cost estimation                                   │
└─────────────────────────────────────────────────────┘
```

---

## App-Isolated Groq Keys

Each KENUXA app has its own Groq API key. This ensures:
- App rate limits don't affect each other
- Usage is tracked per product
- Independent free credits on new Groq accounts

```bash
# In .env.local:
GROQ_CORE_API_KEY=gsk_xxxxx    # Core's own key
GROQ_REACH_API_KEY=gsk_xxxxx   # Reach gets its own key
GROQ_OPS_API_KEY=gsk_xxxxx     # OPS gets its own key
GROQ_ZURIA_API_KEY=gsk_xxxxx   # Zuria gets its own key
GROQ_ACADEMY_API_KEY=gsk_xxxxx # Academy gets its own key
```

Create separate accounts on [console.groq.com](https://console.groq.com) for each.

---

## Model Tiers

| Tier | Groq Model | OpenAI | Anthropic | Use for |
|---|---|---|---|---|
| `fast` | llama-3.1-8b-instant | gpt-4o-mini | claude-haiku-4-5 | Classification, extraction, short tasks |
| `balanced` | llama-3.3-70b-versatile | gpt-4o-mini | claude-sonnet-4-6 | Analysis, generation, summaries |
| `powerful` | llama-3.3-70b-versatile | gpt-4o | claude-opus-4-7 | Complex reasoning, reports, strategy |
| `embed` | — | text-embedding-3-small | — | Vector embeddings, semantic search |

---

## Usage by App

### Direct SDK usage (in any app):
```typescript
import { getAIGateway } from '@kenuxa/ai'

const ai = getAIGateway()

// Fast classification
const result = await ai.chat({
  app: 'reach',
  organizationId: orgId,
  task: 'entity_classification',
  messages: [{ role: 'user', content: prompt }],
  tier: 'fast',
  temperature: 0.1,
})

// Powerful analysis
const report = await ai.chat({
  app: 'reach',
  organizationId: orgId,
  task: 'market_analysis',
  messages: [
    { role: 'system', content: 'You are an African market intelligence analyst.' },
    { role: 'user', content: analysisPrompt },
  ],
  tier: 'powerful',
})

// Embeddings
const vectors = await ai.embed({
  app: 'zuria',
  organizationId: orgId,
  text: ['document 1', 'document 2'],
})
```

### Via Core API (cross-app HTTP):
```bash
POST /api/ai
X-Service-Key: <KENUXA_CORE_API_KEY>
Content-Type: application/json

{
  "app": "ops",
  "organizationId": "uuid",
  "task": "voice_command_parse",
  "prompt": "Schedule a meeting tomorrow at 3pm",
  "tier": "fast"
}
```

---

## Cost Tracking

All AI requests are logged to `ai_requests` in Core's Supabase:

```sql
select
  provider,
  model,
  sum(prompt_tokens + completion_tokens) as total_tokens,
  sum(estimated_cost_usd) as total_cost_usd,
  count(*) as requests
from ai_requests
where created_at > now() - interval '30 days'
group by provider, model
order by total_cost_usd desc;
```

---

## Adding New Providers

1. Create adapter in `packages/ai/src/providers/`
2. Register in `packages/ai/src/gateway.ts` `registerAdapters()`
3. Add model to `TIER_MODELS` map
4. Add env key to `packages/ai/src/gateway.ts` `GatewayConfig`
5. Add cost rates to `COST_PER_1K` map

---

## Future: Local / Edge Inference

The gateway is designed to support Ollama (local) and edge inference:

```typescript
// Ollama adapter (add when needed):
import { createOllamaAdapter } from '@kenuxa/ai/providers/ollama'
// Automatically used when OLLAMA_URL is set in env
```
