# KENUXA ACADEMY — Architecture (Phase 1)

## Overview

KENUXA ACADEMY is the human development product in the KENUXA ecosystem. Phase 1 establishes the complete identity foundation: users, profiles, and a seven-dimension identity state model.

## System Design

```
┌─────────────────────────────────────────────┐
│              apps/academy (Next.js)          │
│  port 3003  — App Router, TypeScript, RSC    │
│                                             │
│  /              → Landing page              │
│  /auth/register → Register form             │
│  /auth/login    → Login form                │
│  /dashboard     → Profile + Identity scores │
└───────────────┬─────────────────────────────┘
                │ HTTP  /auth  /profile  /identity
                ▼
┌─────────────────────────────────────────────┐
│       services/identity-service             │
│  port 4001  — Express, Prisma, bcrypt, jose │
│                                             │
│  POST /auth/register                        │
│  POST /auth/login                           │
│  GET  /auth/me                              │
│  GET  /profile                              │
│  PUT  /profile                              │
│  GET  /identity/state                       │
│  PUT  /identity/state                       │
└───────────────┬─────────────────────────────┘
                │ Prisma ORM
                ▼
┌─────────────────────────────────────────────┐
│           PostgreSQL Database               │
│  academy_users                              │
│  academy_profiles                           │
│  academy_identity_states                    │
└─────────────────────────────────────────────┘
```

## Folder Structure

```
services/identity-service/
├── prisma/
│   └── schema.prisma          # DB schema: User, Profile, IdentityState
├── src/
│   ├── controllers/           # HTTP layer only — parse input, call service, respond
│   │   ├── auth.controller.ts
│   │   ├── profile.controller.ts
│   │   └── identity.controller.ts
│   ├── services/              # Business logic only — no req/res objects
│   │   ├── auth.service.ts
│   │   ├── profile.service.ts
│   │   └── identity.service.ts
│   ├── routes/                # Route → controller mapping
│   │   ├── auth.routes.ts
│   │   ├── profile.routes.ts
│   │   └── identity.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT verification, attaches req.user
│   │   └── error.middleware.ts # Centralised error → HTTP response
│   ├── lib/
│   │   ├── prisma.ts           # Singleton PrismaClient
│   │   └── jwt.ts              # signToken / verifyToken (jose, HS256)
│   ├── app.ts                  # Express app config
│   └── server.ts               # DB connect + listen
```

## Architecture Rules

| Layer       | Responsibility                        | Rule                        |
|-------------|---------------------------------------|-----------------------------|
| Controller  | Parse request, validate with Zod      | No business logic           |
| Service     | Business logic, DB interaction        | No req/res objects          |
| Middleware  | Cross-cutting: auth, errors           | Pure functions              |
| Routes      | Map URL + method to controller        | No logic                    |

## Shared Packages Used

- `@kenuxa/shared-types` — `AcademyUser`, `AcademyProfile`, `IdentityState`, payloads
- `@kenuxa/auth` — not used directly (identity-service owns its own JWT for Phase 1)

## Identity State Model

Seven dimensions of human development, each scored 0–100:

| Dimension   | Measures                                  |
|-------------|-------------------------------------------|
| Cognitive   | Learning speed, reasoning, problem-solving|
| Creative    | Ideation, innovation, artistic thinking   |
| Social      | Communication, collaboration, networking  |
| Emotional   | Self-awareness, empathy, resilience       |
| Practical   | Execution, discipline, life skills        |
| Leadership  | Vision, influence, decision-making        |
| Economic    | Financial literacy, value creation        |

All scores default to 0. Future phases will populate via assessments, learning events, and AI inference.

## Future Phase Compatibility

Every model includes a `metadata JSON` column as the extension point:

- **Phase 5 (Knowledge Graph)**: knowledge graph node IDs stored in `profile.metadata`
- **Phase 6 (AI)**: vector embedding refs stored in `identityState.metadata`
- **Phase 8 (Marketplace)**: skill credentials stored in `profile.metadata`
- **Phase 9 (Innovation)**: project refs stored in `profile.metadata`

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT HS256 tokens, 24h TTL
- Helmet.js security headers
- CORS restricted to Academy frontend origin
- Input validation with Zod on all endpoints
