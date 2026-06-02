# KENUXA ACADEMY — Architecture (Phase 1)

## Overview

KENUXA ACADEMY is the human development product in the KENUXA ecosystem. Phase 1 establishes the complete identity foundation: shared ecosystem auth, Academy-specific profiles, and a seven-dimension identity state model.

## Shared Auth Principle

```
┌─────────────────────┐     ┌──────────────────────┐
│  KENUXA NETWORK     │     │  KENUXA ACADEMY       │
│  (port 3002)        │     │  (port 3003)          │
│                     │     │                       │
│  supabase.auth      │     │  supabase.auth        │
└──────────┬──────────┘     └──────────┬────────────┘
           │                           │
           └─────────┬─────────────────┘
                     │  SAME Supabase Project
                     │  SAME JWT_SECRET
                     ▼
           ┌──────────────────┐
           │   Supabase Auth  │
           │   (users table)  │
           └──────────────────┘
```

A user registered on KENUXA NETWORK can sign in to KENUXA ACADEMY with the **exact same email + password**. On first Academy login, Academy-specific rows (profile, identity state) are auto-provisioned.

## Full System Design

```
┌─────────────────────────────────────────────┐
│           apps/academy (Next.js)            │
│  port 3003  — App Router, TypeScript, RSC   │
│                                             │
│  /              → Landing                  │
│  /auth/register → Register (Supabase Auth)  │
│  /auth/login    → Login   (Supabase Auth)   │
│  /auth/callback → OAuth callback            │
│  /dashboard     → Profile + scores + wallet │
│                                             │
│  middleware.ts  → Supabase session guard    │
└───────────────┬─────────────────────────────┘
                │ HTTP  (Supabase JWT as Bearer)
                ▼
┌─────────────────────────────────────────────┐
│       services/identity-service             │
│  port 4001  — Express, Prisma, jose         │
│                                             │
│  POST /auth/register   → Supabase signup    │
│  POST /auth/login      → Supabase password  │
│  POST /auth/refresh    → Supabase refresh   │
│  GET  /auth/me         → user meta          │
│  POST /auth/provision  → idempotent setup   │
│  GET  /profile         → Academy profile    │
│  PUT  /profile         → Update profile     │
│  GET  /identity/state  → 7-dim scores       │
│  PUT  /identity/state  → Update scores      │
│  GET  /wallet/balance  → proxies → CORE     │
│  GET  /wallet/txns     → proxies → CORE     │
└────────┬──────────────────┬─────────────────┘
         │ Prisma ORM        │ HTTP → KENUXA CORE
         ▼                   ▼
  ┌──────────────┐   ┌──────────────────┐
  │  PostgreSQL  │   │  KENUXA CORE     │
  │  (Academy    │   │  port 3000       │
  │   tables)    │   │  /api/wallet/... │
  └──────────────┘   └──────────────────┘
         │
   Verifies tokens via
   SUPABASE_JWT_SECRET
   (shared with Network)
```

## Folder Structure

```
services/identity-service/
├── prisma/
│   └── schema.prisma          # AcademyUserMeta, Profile, IdentityState
├── src/
│   ├── controllers/           # HTTP only — no business logic
│   │   ├── auth.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── identity.controller.ts
│   │   └── wallet.controller.ts
│   ├── services/              # Business logic — no req/res objects
│   │   ├── auth.service.ts    # delegates to Supabase Auth REST API
│   │   ├── profile.service.ts
│   │   ├── identity.service.ts
│   │   └── wallet.service.ts  # proxies to KENUXA CORE
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── identity.routes.ts
│   │   ├── wallet.routes.ts
│   │   └── provision.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts  # verifies Supabase JWT via SUPABASE_JWT_SECRET
│   │   └── error.middleware.ts
│   ├── lib/
│   │   ├── prisma.ts           # Singleton PrismaClient
│   │   └── jwt.ts              # verifySupabaseToken (jose)
│   ├── app.ts
│   └── server.ts

apps/academy/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.tsx      # Supabase signInWithPassword
│   │   │   ├── register/page.tsx   # Supabase signUp
│   │   │   └── callback/route.ts   # OAuth + magic link exchange
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Server component — RSC data fetch
│   │   │   └── DashboardClient.tsx # Client — sign out, interactive UI
│   │   └── page.tsx               # Landing
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # createBrowserClient
│   │   │   └── server.ts          # createServerClient
│   │   └── identity-client.ts     # calls identity-service with Supabase JWT
│   └── middleware.ts              # Supabase session guard
```

## Architecture Rules

| Layer      | Responsibility                    | Rule                 |
|------------|-----------------------------------|----------------------|
| Controller | Parse request, validate with Zod  | No business logic    |
| Service    | Business logic, external API      | No req/res objects   |
| Middleware | JWT verification, error handling  | Pure functions       |
| Routes     | URL + method → controller         | No logic             |

## Auth Flow

```
1. User signs in (Supabase email+password)
   → Supabase issues access_token (HS256, signed with SUPABASE_JWT_SECRET)

2. Academy web app stores token in Supabase cookie (SSR-safe)

3. API calls from browser: Authorization: Bearer <supabase_access_token>

4. Identity-service middleware calls verifySupabaseToken()
   → jwtVerify using SUPABASE_JWT_SECRET
   → extracts sub (user UUID), email, role

5. First Academy access → POST /auth/provision
   → ensures academy_user_meta + profile + identity_state rows exist
   → idempotent, safe to call on every login
```

## Data Ownership

| Data                | Owned by         | Accessed via         |
|---------------------|------------------|----------------------|
| User accounts       | Supabase Auth    | Supabase SDK         |
| KENUX wallet        | KENUXA CORE      | /api/wallet/*        |
| Events / graph      | KENUXA CORE      | Future phases        |
| Academy profile     | Identity Service | /profile             |
| Identity scores     | Identity Service | /identity/state      |

## Identity State — Seven Dimensions

| Dimension   | Measures                                    |
|-------------|---------------------------------------------|
| Cognitive   | Learning, reasoning, problem-solving        |
| Creative    | Ideation, innovation, artistic thinking     |
| Social      | Communication, collaboration, networking    |
| Emotional   | Self-awareness, empathy, resilience         |
| Practical   | Execution, discipline, life skills          |
| Leadership  | Vision, influence, decision-making          |
| Economic    | Financial literacy, value creation          |

Scores default to 0. Future phases populate via assessments + AI inference.

## Future Phase Extension Points

Every model includes a `metadata JSON` column:

- **Phase 5 (Knowledge Graph)**: graph node IDs in `profile.metadata`
- **Phase 6 (AI)**: vector embedding refs in `identityState.metadata`
- **Phase 8 (Marketplace)**: skill credential badges in `profile.metadata`
- **Phase 9 (Innovation)**: project + team refs in `profile.metadata`
