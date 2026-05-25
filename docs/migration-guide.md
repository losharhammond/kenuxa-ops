# KENUXA REACH → Core Migration Guide

This guide covers migrating KENUXA REACH from its current standalone state to a Core-connected ecosystem member. Each step is independent — migrate one service at a time.

---

## Prerequisites

1. KENUXA CORE running at `https://core.kenuxa.com` (or `http://localhost:3000` locally)
2. `KENUXA_CORE_API_KEY` set (same key in both Core and Reach `.env.local`)
3. `JWT_SECRET` same value in both apps
4. Both apps pointing to the **same Supabase project** for auth

---

## Step 1: Install SDK in REACH

```bash
# In Desktop/kenuxa-reach
pnpm add @kenuxa/sdk@workspace:*
# OR if not in same monorepo yet:
pnpm add @kenuxa/ai @kenuxa/auth @kenuxa/wallet @kenuxa/events @kenuxa/shared-types
```

Create `src/lib/kenuxa.ts`:

```typescript
import { initKenuxaSDK } from '@kenuxa/sdk'

let initialized = false

export function initSDK() {
  if (initialized) return
  initialized = true
  initKenuxaSDK({
    app: 'reach',
    coreUrl:    process.env.KENUXA_CORE_URL ?? 'http://localhost:3000',
    serviceKey: process.env.KENUXA_CORE_API_KEY ?? '',
    ai: {
      groqKeys: {
        reach: process.env.GROQ_REACH_API_KEY,
        core:  process.env.GROQ_CORE_API_KEY,
      },
      openaiKey:    process.env.OPENAI_API_KEY,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
    },
  })
}
```

Call `initSDK()` in `src/instrumentation.ts`:
```typescript
export async function register() {
  const { initSDK } = await import('./lib/kenuxa')
  initSDK()
}
```

---

## Step 2: Migrate AI Gateway

**Before** (current in REACH):
```typescript
// src/lib/groq/client.ts
import Groq from 'groq-sdk'
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
```

**After** (using Core gateway):
```typescript
import { getAIGateway } from '@kenuxa/ai'

export async function runGroqFast(prompt: string, systemPrompt?: string): Promise<string> {
  const ai = getAIGateway()
  const result = await ai.chat({
    app: 'reach',
    organizationId: 'system',  // replace with actual orgId where available
    task: 'reach_inference',
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
    tier: 'fast',
  })
  return result.content
}

export async function runGroqBalanced(prompt: string, systemPrompt?: string): Promise<string> {
  const ai = getAIGateway()
  const result = await ai.chat({
    app: 'reach',
    organizationId: 'system',
    task: 'reach_inference',
    messages: [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      { role: 'user' as const, content: prompt },
    ],
    tier: 'balanced',
  })
  return result.content
}
```

Then update all imports from `@/lib/groq/client` to use the new wrappers.

---

## Step 3: Migrate KENUX Wallet

**Before** (current in REACH — local Supabase):
```typescript
// src/services/platform/kenux.service.ts
const supabase = await createClient()
await supabase.from('kenux_wallets').select(...)
```

**After** (calling Core wallet API):
```typescript
import { getWalletClient } from '@kenuxa/wallet'

export async function getOrCreateWallet(userId: string) {
  const wallet = getWalletClient()
  return wallet.getWallet(userId)
}

export async function creditKenux(opts: CreditKenuxPayload) {
  const wallet = getWalletClient()
  return wallet.credit(opts)
}

export async function debitKenux(opts: DebitKenuxPayload) {
  const wallet = getWalletClient()
  return wallet.debit(opts)
}
```

Update `src/app/api/kenux/route.ts` and `src/app/api/activation/route.ts` to use new functions.

---

## Step 4: Add Event Emission

After key operations, emit events to Core's event bus:

```typescript
import { getEventClient } from '@kenuxa/events'

// In trend detection:
const events = getEventClient()
events.emitSilent({
  event: 'reach.trend.detected',
  organizationId: orgId,
  payload: {
    trend_id:    trend.id,
    signal_type: trend.signal_type,
    title:       trend.title,
    velocity:    trend.velocity,
    countries:   trend.countries,
  },
})

// In campaign completion:
events.emitSilent({
  event: 'reach.campaign.completed',
  organizationId: orgId,
  payload: {
    campaign_id:     log.id,
    channel:         log.channel,
    sent_count:      log.sent_count,
    delivered_count: log.delivered_count,
    failed_count:    log.failed_count,
    cost_kenux:      log.cost_kenux,
  },
})
```

---

## Step 5: Update Auth to Use Core Supabase

In `src/lib/supabase/client.ts` and `server.ts` — ensure they point to Core's Supabase:

```bash
# In REACH .env.local — USE CORE'S Supabase (same project)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co    # ← Core's URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx                  # ← Core's anon key
```

This ensures user accounts created via REACH exist in Core's auth system.

---

## Step 6: Add Core URLs to REACH .env.local

```bash
# KENUXA CORE connection
KENUXA_CORE_URL=https://core.kenuxa.com
KENUXA_CORE_API_KEY=<generate with: openssl rand -hex 32>

# Per-app Groq key (separate from CORE's key)
GROQ_REACH_API_KEY=gsk_xxxxx

# Shared JWT secret (SAME VALUE as in Core)
JWT_SECRET=<64-char-hex: openssl rand -hex 32>
```

---

## Rollback Strategy

Each step is independently reversible. Feature flags in Core can disable cross-app calls and fall back to local implementations. No big-bang migration needed.
