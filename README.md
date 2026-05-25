# KENUXA Ecosystem

> Africa's Unified Intelligence Infrastructure

---

## What is this?

This is the **KENUXA monorepo** — a unified workspace for all KENUXA products. Every product shares infrastructure through **KENUXA CORE**, the ecosystem operating system.

```
KENUXA CORE ────────── ecosystem OS (auth, AI, wallet, graph, events)
    │
    ├── KENUXA REACH ── intelligence platform (Africa's autonomous intel)
    ├── KENUXA OPS   ── voice + automation platform
    ├── ZURIA        ── semantic memory + reasoning
    └── KENUXA ACADEMY ─ learning + certification
```

---

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Supabase account

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up KENUXA CORE
```bash
cd apps/core
cp ../../.env.example .env.local
# Fill in Supabase URL, keys, JWT_SECRET, and at least one AI key
```

Run the Supabase SQL editor → paste `supabase/schema.sql` then `supabase/schema_v2.sql`.

### 3. Run Core
```bash
pnpm dev:core
# Starts at http://localhost:3000
```

### 4. Run REACH (optional — standalone for now)
```bash
cd ../kenuxa-reach    # Desktop/kenuxa-reach
cp .env.example .env.local
pnpm dev
# Starts at http://localhost:3001
```

### 5. Add Core connection to REACH
```bash
# In Desktop/kenuxa-reach/.env.local:
KENUXA_CORE_URL=http://localhost:3000
KENUXA_CORE_API_KEY=<same as Core's KENUXA_CORE_API_KEY>
JWT_SECRET=<same 64-char hex as Core>
GROQ_REACH_API_KEY=<separate Groq key for Reach>
```

---

## Monorepo Commands

```bash
# Run all apps in dev mode
pnpm dev

# Run specific app
pnpm dev:core
pnpm dev:reach

# Build all packages
pnpm build:pkgs

# Type check everything
pnpm typecheck

# Clean all build artifacts
pnpm clean
```

---

## Package Usage

Any app in the ecosystem imports from `@kenuxa/sdk`:

```typescript
import { initKenuxaSDK, getAIGateway, getWalletClient, getEventClient } from '@kenuxa/sdk'
import type { Organization, KenuxWallet, TrendSignal } from '@kenuxa/sdk'
```

---

## Documentation

| Doc | Description |
|---|---|
| [ecosystem-architecture.md](docs/ecosystem-architecture.md) | Full architecture overview |
| [ai-system.md](docs/ai-system.md) | Multi-provider AI gateway |
| [wallet-system.md](docs/wallet-system.md) | KENUX currency system |
| [auth-system.md](docs/auth-system.md) | Unified auth + SSO |
| [migration-guide.md](docs/migration-guide.md) | Migrating REACH to Core services |
| [roadmap.md](docs/roadmap.md) | What's done, what's next |

---

## Environment Keys

Generate secure keys:
```bash
# Generate JWT_SECRET (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate KENUXA_CORE_API_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Both `JWT_SECRET` values **must be identical** across all apps.

---

## Compliance

KENUXA is built on lawful intelligence principles:
- Only collects publicly accessible data
- Communication via official APIs with opt-in consent only
- Rate limiting enforced on all outbound operations
- Full audit trail for all admin actions
- GDPR-informed data handling
