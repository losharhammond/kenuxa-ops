# KENUXA Ecosystem Architecture

> Africa's Unified Intelligence Infrastructure

---

## Overview

The KENUXA ecosystem is a collection of deeply interconnected platforms built on a shared foundation. Every product shares the same identity, AI, wallet, graph, and event infrastructure — all owned and managed by **KENUXA CORE**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        KENUXA ECOSYSTEM                          │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  REACH   │  │   OPS    │  │  ZURIA   │  │ ACADEMY  │         │
│  │          │  │          │  │          │  │          │         │
│  │ Intel    │  │ Voice    │  │ Memory   │  │ Learning │         │
│  │ Market   │  │ Workflow │  │ Reason   │  │ Training │         │
│  │ Crawl    │  │ Automate │  │ Context  │  │ Cert     │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │              │              │              │               │
│       └──────────────┴──────────────┴──────────────┘               │
│                              │                                    │
│                     ┌────────▼────────┐                           │
│                     │  KENUXA CORE    │                           │
│                     │                 │                           │
│                     │  Auth & Identity │                          │
│                     │  Organizations  │                           │
│                     │  KENUX Wallet   │                           │
│                     │  AI Gateway     │                           │
│                     │  Event Bus      │                           │
│                     │  Graph Engine   │                           │
│                     │  Memory Store   │                           │
│                     │  Permissions    │                           │
│                     │  Subscriptions  │                           │
│                     │  Notifications  │                           │
│                     │  Admin          │                           │
│                     └─────────────────┘                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Products

### KENUXA CORE (Ecosystem OS)
**Location:** `apps/core`  
**Port:** 3000  
**Purpose:** The operating system of the ecosystem. Owns all shared infrastructure. No product logic — only infrastructure services.

### KENUXA REACH (Intelligence Platform)
**Location:** `apps/reach` (`Desktop/kenuxa-reach`)  
**Port:** 3001  
**Purpose:** Africa's autonomous intelligence and distribution infrastructure. Owns crawling, extraction, trend detection, intelligence marketplaces, and compliant activation.

### KENUXA OPS (Voice & Automation)
**Location:** `apps/ops` *(planned)*  
**Port:** 3002  
**Purpose:** Hands-free operations, voice commands, workflow execution, operational automation.

### ZURIA (Semantic Memory)
**Location:** `apps/zuria` *(in development)*  
**Port:** 3003  
**Purpose:** Long-term AI memory, reasoning systems, contextual understanding, persistent semantic memory.

### KENUXA ACADEMY *(planned)*
**Location:** `apps/academy`  
**Port:** 3004  
**Purpose:** Learning, training, certifications for African intelligence professionals.

---

## Monorepo Structure

```
KENUXA/
├── apps/
│   ├── core/              ← KENUXA CORE (ecosystem OS)
│   ├── reach/             ← KENUXA REACH (intelligence platform)
│   ├── ops/               ← KENUXA OPS (voice + automation)
│   ├── zuria/             ← ZURIA (semantic memory)
│   └── academy/           ← KENUXA ACADEMY (learning)
│
├── packages/
│   ├── sdk/               ← @kenuxa/sdk — main entry point
│   ├── shared-types/      ← @kenuxa/shared-types — TypeScript types
│   ├── shared-utils/      ← @kenuxa/shared-utils — utilities
│   ├── ai/                ← @kenuxa/ai — multi-provider AI gateway
│   ├── auth/              ← @kenuxa/auth — ecosystem auth client
│   ├── wallet/            ← @kenuxa/wallet — KENUX wallet client
│   ├── events/            ← @kenuxa/events — event bus client
│   ├── graph/             ← @kenuxa/graph — graph infrastructure client
│   ├── analytics/         ← @kenuxa/analytics — usage tracking
│   └── ui/                ← @kenuxa/ui — shared React components
│
├── infrastructure/
│   ├── docker/            ← Docker configurations
│   ├── workers/           ← BullMQ workers
│   ├── queues/            ← Queue definitions
│   └── monitoring/        ← Health checks, alerts
│
├── docs/                  ← Ecosystem documentation
├── services/              ← External service integrations
├── turbo.json             ← Turborepo build orchestration
├── pnpm-workspace.yaml    ← pnpm workspace config
└── package.json           ← Root workspace
```

---

## Ecosystem Rules (MANDATORY)

### Rule 1: Everything connects through Core
No app talks directly to another app's database. All cross-app operations go through Core APIs.

### Rule 2: No duplication of infrastructure
- ONE auth system (Core owns it)
- ONE wallet system (Core owns KENUX)
- ONE AI gateway (Core routes all AI)
- ONE graph (Core owns the knowledge graph)
- ONE event bus (Core manages events)
- ONE permissions system (Core enforces RBAC)

### Rule 3: App ownership boundaries

| System | Owner | Others must... |
|---|---|---|
| Auth / Identity | CORE | Call `/api/auth/*` or use `@kenuxa/auth` |
| Organizations | CORE | Call `/api/organizations/*` |
| KENUX Wallet | CORE | Call `/api/wallet/*` or use `@kenuxa/wallet` |
| AI Inference | CORE Gateway | Call `/api/ai` or use `@kenuxa/ai` |
| Graph / Knowledge | CORE | Call `/api/graph/*` |
| Event Bus | CORE | Call `/api/events/*` or use `@kenuxa/events` |
| Intelligence / Crawl | REACH | Others call REACH API |
| Voice / Workflows | OPS | Others call OPS API |
| Semantic Memory | ZURIA | Others call ZURIA API |

### Rule 4: Database ownership
Each app has its own Supabase project. Core's Supabase owns: users, organizations, wallets, subscriptions, permissions, notifications. Product Supabase projects own their domain data.

---

## SDK Usage

### Initialize the SDK (in every app)

```typescript
// lib/kenuxa.ts (in apps/reach, apps/ops, etc.)
import { initKenuxaSDK } from '@kenuxa/sdk'

initKenuxaSDK({
  app:        'reach',
  coreUrl:    process.env.KENUXA_CORE_URL!,
  serviceKey: process.env.KENUXA_CORE_API_KEY!,
  ai: {
    groqKeys: {
      reach: process.env.GROQ_REACH_API_KEY,
      core:  process.env.GROQ_CORE_API_KEY,
    },
    openaiKey:    process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
  },
})
```

### Use services anywhere

```typescript
import { getAIGateway, getWalletClient, getEventClient } from '@kenuxa/sdk'

// AI
const ai = getAIGateway()
const result = await ai.chat({
  app: 'reach',
  organizationId: orgId,
  task: 'classify_entity',
  messages: [{ role: 'user', content: 'Classify this entity...' }],
  tier: 'fast',
})

// Wallet
const wallet = getWalletClient()
await wallet.debit({ userId, amount: 5, type: 'spend', description: 'AI classification' })

// Events
const events = getEventClient()
events.emitSilent({ event: 'reach.entity.extracted', organizationId: orgId, payload: entity })
```

---

## Data Flow Example: Intelligence Extraction

```
User requests entity extraction (REACH)
    │
    ├─► Check KENUX balance (REACH → Core /api/wallet)
    │
    ├─► Run AI classification (REACH → Core /api/ai)
    │      Core routes: Groq REACH key → llama-3.1-8b-instant
    │
    ├─► Store extracted entity (REACH Supabase)
    │
    ├─► Add to knowledge graph (REACH → Core /api/graph)
    │
    ├─► Debit KENUX (REACH → Core /api/wallet)
    │
    └─► Emit event (REACH → Core /api/events → subscribers)
             └─► OPS workflow triggered (if subscribed)
             └─► ZURIA memory update (if subscribed)
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth + custom JWT federation |
| AI | Groq (primary) + OpenAI + Anthropic + 6 more providers |
| Payments | Paystack (NGN primary) |
| Queue | BullMQ + Redis / Upstash |
| Build | Turborepo + pnpm workspaces |
| Hosting | Vercel (apps) + VPS (workers) |
| Monitoring | Custom health endpoints + Sentry (planned) |
| Graph | PostgreSQL graph tables + pgvector |
| Search | Hybrid: full-text + semantic (pgvector) |

---

## Security Model

1. **Service-to-service**: `X-Service-Key` header with `KENUXA_CORE_API_KEY`
2. **User sessions**: Supabase Auth JWTs validated by each app
3. **Cross-app tokens**: Short-lived JWTs signed with shared `JWT_SECRET`
4. **RLS everywhere**: Every Supabase table has Row Level Security enabled
5. **Audit logging**: All admin and cross-app actions logged to `admin_logs`
6. **Rate limiting**: Per-org API limits enforced by Core
7. **KENUX gating**: Feature access gated by balance + tier via `feature_gates`

---

## Deployment Architecture

```
Production:
  Core    → https://core.kenuxa.com  (Vercel)
  Reach   → https://reach.kenuxa.com (Vercel)
  OPS     → https://ops.kenuxa.com   (Vercel / VPS)
  Zuria   → https://zuria.kenuxa.com (Vercel)

Workers (VPS / Railway):
  Queue workers for: AI jobs, crawling, event processing

Shared:
  Redis   → Upstash (queue + cache)
  Storage → Supabase Storage
```
