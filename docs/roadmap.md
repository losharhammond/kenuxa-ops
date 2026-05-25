# KENUXA Ecosystem Roadmap

## Current State (May 2026)

### ✅ KENUXA CORE — Phase 1 Complete
- Auth system (Supabase + JWT)
- Organization management + RBAC
- AI orchestration (Groq single-provider)
- Memory system (pgvector)
- Knowledge graph (graph_nodes + graph_edges)
- Event bus (PostgreSQL-backed)
- Workflow engine (basic)
- Integrations registry
- Analytics + notifications

### ✅ KENUXA CORE — Phase 2 (This session)
- Multi-provider AI gateway (Groq + OpenAI + Anthropic + 5 more)
- App-isolated Groq API keys (separate rate limits per product)
- KENUX wallet system (credit/debit/transfer, atomic PostgreSQL functions)
- Subscription tiers (Free → Government)
- Feature gates system
- Cross-app service auth (`X-Service-Key`)
- Ecosystem service tokens (JWT federation)
- Schema v2 (wallet, subscriptions, feature gates, payment events, admin logs)
- Upgraded AI gateway with fallback chain + cost tracking
- Wallet API: `/api/wallet/*`
- AI Gateway API: `/api/ai` (multi-provider, app-aware)

### ✅ KENUXA REACH — Phase 5 Complete
- Autonomous intelligence extraction
- Trend signals + market intelligence
- Competitor intelligence
- Creator discovery
- Visibility optimizer
- Entity explorer + graph
- Communication activation engine (WhatsApp, Telegram, Email, SMS)
- Intelligence marketplace with AI valuation
- Paystack payment integration
- KENUX wallet (local, to migrate to Core)
- Admin control center
- Public intelligence landing page

### ✅ Shared Packages (This session)
- `@kenuxa/shared-types` — full ecosystem TypeScript types
- `@kenuxa/ai` — multi-provider AI gateway package
- `@kenuxa/auth` — ecosystem auth client + JWT federation
- `@kenuxa/wallet` — KENUX wallet client
- `@kenuxa/events` — event bus client
- `@kenuxa/sdk` — unified SDK entry point
- Turborepo monorepo configuration

---

## Next: CORE Phase 3

### Priority 1 — Migration
- [ ] Migrate REACH wallet to call Core wallet API (remove local wallet)
- [ ] Migrate REACH AI calls to Core AI gateway (use `@kenuxa/ai`)
- [ ] Connect REACH event emission to Core event bus
- [ ] Unified login: REACH users authenticate via Core Supabase

### Priority 2 — Core Features
- [ ] `/api/graph/*` upgrade — vector search + semantic similarity
- [ ] `/api/search` — hybrid search (full-text + semantic) across all ecosystem data
- [ ] Subscription management UI at `/subscriptions`
- [ ] Paystack subscription webhooks in Core
- [ ] Redis-based rate limiting (replace in-memory)
- [ ] Admin dashboard at `/admin` in Core
- [ ] Usage analytics dashboard

### Priority 3 — Infrastructure
- [ ] BullMQ worker setup for async AI jobs
- [ ] Redis event queue for high-throughput events
- [ ] Health check endpoint `/api/health`
- [ ] Prometheus metrics at `/api/metrics`
- [ ] Docker compose for local full-stack dev

---

## Next: KENUXA REACH Phase 6

### Intelligence Upgrades
- [ ] pgvector semantic search integrated (via Core `/api/search`)
- [ ] Deep company profiles (executives, financials, subsidiaries)
- [ ] Advanced graph visualization (D3.js / Cytoscape)
- [ ] AI-powered market forecasting
- [ ] Competitor SWOT automation
- [ ] RSS + news feed ingestion workers

### Marketplace
- [ ] Real file uploads (Supabase Storage)
- [ ] Marketplace browse page
- [ ] Dataset preview system
- [ ] Revenue dashboard for sellers
- [ ] Dispute resolution workflow

---

## Upcoming: KENUXA OPS

### Phase 1 Scope
- [ ] Voice command parsing (Deepgram + Groq)
- [ ] Workflow builder UI
- [ ] Email automation (Resend)
- [ ] Schedule management
- [ ] Integration with REACH intelligence
- [ ] KENUX billing for operations

---

## Upcoming: ZURIA

### Phase 1 Scope
- [ ] Persistent conversation memory
- [ ] Semantic search over memory store
- [ ] Memory graph (person → conversations → insights)
- [ ] Cross-app context resolution
- [ ] Memory timeline UI
- [ ] Integration with OPS for voice memory

---

## Long-term Vision (2027+)

### Infrastructure Evolution
- Kubernetes migration for Core
- Multi-region deployment (Lagos, Nairobi, Johannesburg)
- Edge inference (Cloudflare Workers + Ollama)
- Real-time collaboration via Supabase Realtime
- Mobile SDK (`@kenuxa/sdk/mobile`)

### Product Evolution
- KENUXA ACADEMY — intelligence certifications, AI training courses
- KENUXA MAPS — geospatial intelligence layer for Africa
- KENUXA SIGNALS — real-time market signals API for external developers
- KENUXA API — public REST API for third-party integrations

### Ecosystem Economy
- KENUX on-chain component (optional, for cross-border transfers)
- B2B KENUX marketplace (businesses selling to businesses)
- KENUX staking for governance participation
- Developer API monetization via KENUX

---

## Migration Path: REACH → Core Services

When ready, REACH migrates to Core services in this order:

1. **Auth** — Point Supabase client to Core's Supabase project
2. **Wallet** — Replace local wallet service with `@kenuxa/wallet` client
3. **AI** — Replace `@/lib/groq/client.ts` with `@kenuxa/ai` gateway
4. **Events** — Add `@kenuxa/events` emission after key operations
5. **Graph** — Move entity graph to Core's graph tables

This migration can be done incrementally — each service independently.
