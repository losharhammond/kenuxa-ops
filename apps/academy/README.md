# KENUXA ACADEMY

> Human Development Operating System — Phase 1 Foundation

KENUXA ACADEMY is the learning and human development product in the KENUXA ecosystem. Users develop seven core human dimensions: Cognitive, Creative, Social, Emotional, Practical, Leadership, and Economic.

---

## Architecture Overview

```
apps/academy (Next.js, port 3003)
        │
        │  Supabase JWT (Bearer token)
        ▼
services/identity-service (Express, port 4001)
        │
        ├── PostgreSQL (Academy-specific tables via Prisma)
        └── KENUXA CORE (wallet proxy, port 3000)
```

**Shared Auth:** Academy uses the same Supabase project as KENUXA NETWORK.  
A KENUXA Network user can log in to Academy with the same email + password — no new account needed.

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 20, pnpm ≥ 9
- Docker (for local Postgres) or Supabase project access
- Same Supabase project as KENUXA NETWORK

### 2. Install
```bash
cd /path/to/KENUXA
pnpm install
```

### 3. Start local database (optional — skip if using Supabase)
```bash
docker compose -f infrastructure/db/docker-compose.academy.yml up -d
# DATABASE_URL = postgresql://academy:academy_dev_password@localhost:5433/kenuxa_academy
```

### 4. Configure identity-service
```bash
cd services/identity-service
cp .env.example .env
# Fill in: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
```

### 5. Run Prisma migrations
```bash
cd services/identity-service
pnpm db:generate
pnpm db:migrate
```

### 6. Configure Academy web app
```bash
cd apps/academy
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 7. Start both services
```bash
# From monorepo root:
pnpm dev:academy    # starts Next.js on :3003
pnpm dev:identity   # starts identity-service on :4001

# Or individually:
cd services/identity-service && pnpm dev
cd apps/academy && pnpm dev
```

---

## API Endpoints

| Method | Path                    | Auth | Description                         |
|--------|-------------------------|------|-------------------------------------|
| POST   | /auth/register          | —    | Register (same Supabase project)    |
| POST   | /auth/login             | —    | Login (works with Network creds)    |
| POST   | /auth/refresh           | —    | Refresh access token                |
| GET    | /auth/me                | ✓    | Current user Academy metadata       |
| POST   | /auth/provision         | ✓    | Idempotent first-login provisioning |
| GET    | /profile                | ✓    | Get Academy profile                 |
| PUT    | /profile                | ✓    | Update profile                      |
| GET    | /identity/state         | ✓    | Get 7-dimension identity scores     |
| PUT    | /identity/state         | ✓    | Update scores                       |
| GET    | /wallet/balance         | ✓    | KENUX wallet balance (from CORE)    |
| GET    | /wallet/transactions    | ✓    | Transaction history (from CORE)     |
| GET    | /health                 | —    | Service health check                |

---

## Folder Structure

```
apps/academy/
  src/
    app/
      auth/login/       ← Supabase login (Network creds work here)
      auth/register/    ← Supabase signup
      auth/callback/    ← OAuth + magic link handler
      dashboard/        ← Identity scores + wallet (Server Component)
    lib/
      supabase/         ← SSR-safe Supabase clients
      identity-client   ← Typed API client for identity-service
    middleware.ts        ← Supabase session guard

services/identity-service/
  src/
    controllers/        ← HTTP only, no business logic
    services/           ← Business logic only
    models/             ← Data access layer (Prisma queries)
    routes/             ← URL → controller mapping
    middleware/         ← JWT verification, error handling
    lib/                ← Prisma client, JWT verifier
  prisma/
    schema.prisma       ← academy_user_meta, academy_profiles, academy_identity_states
```

---

## Domain Model

### Seven-Dimension Identity State

| Dimension   | Measures                               | Score range |
|-------------|----------------------------------------|-------------|
| Cognitive   | Reasoning, learning speed              | 0 – 100     |
| Creative    | Ideation, artistic thinking            | 0 – 100     |
| Social      | Communication, collaboration           | 0 – 100     |
| Emotional   | Self-awareness, empathy                | 0 – 100     |
| Practical   | Execution, discipline                  | 0 – 100     |
| Leadership  | Vision, influence, decision-making     | 0 – 100     |
| Economic    | Financial literacy, value creation     | 0 – 100     |

All scores default to 0. Future phases populate via assessments and AI inference.

---

## Phase Roadmap

| Phase | Feature                              | Status      |
|-------|--------------------------------------|-------------|
| 1     | Foundation: auth, profiles, identity | ✅ Complete |
| 2     | Assessments + scoring engine         | Planned     |
| 3     | Learning journeys + milestones       | Planned     |
| 4     | Mentorship + community               | Planned     |
| 5     | Knowledge graph integration          | Planned     |
| 6     | AI-powered development paths         | Planned     |
| 7     | Certifications + credentials         | Planned     |
| 8     | Marketplace (skills + services)      | Planned     |
| 9     | Innovation + project system          | Planned     |

---

## Contributing

See [`docs/academy-architecture.md`](../../docs/academy-architecture.md) and [`docs/academy-api-spec.md`](../../docs/academy-api-spec.md).
