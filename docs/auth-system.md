# KENUXA Auth System

## Single Identity Across the Ecosystem

A user has ONE account across ALL KENUXA products. Sign up once on any app — use it everywhere. This is enforced through:

1. **Shared Supabase Auth** — all apps connect to Core's Supabase project for auth
2. **Shared JWT secret** — tokens signed by Core are valid in all apps
3. **Ecosystem JWT payload** — tokens carry org, role, tier, and app fields

---

## Auth Flow

```
User signs up on REACH
    │
    ├─► Supabase creates user (Core Supabase project)
    │
    ├─► Email verification sent
    │       └─► User clicks link → /auth/callback
    │               └─► exchangeCodeForSession()
    │                       └─► Check for org → /onboarding if new
    │
    ├─► Onboarding creates organization in Core Supabase
    │
    ├─► Welcome bonus: 100 KENUX credited (Core wallet)
    │
    └─► User lands on /dashboard
```

---

## JWT Token Structure

All ecosystem JWTs contain:

```typescript
{
  sub:   "user_uuid",         // Supabase user ID
  email: "user@example.com",
  org:   "org_uuid",          // primary organization
  role:  "organization_owner",
  app:   "reach",             // app that issued this token
  tier:  "pro",               // subscription tier
  iat:   1716500000,
  exp:   1716500900            // 15-minute access token
}
```

---

## Cross-App Token Validation

Any KENUXA app can validate a token issued by Core:

```typescript
import { verifyEcosystemToken } from '@kenuxa/auth'

// In middleware or API route:
const payload = await verifyEcosystemToken(bearerToken)
// payload.sub = userId, payload.org = orgId, payload.role = role
```

All apps share `JWT_SECRET` — set the same secret in every app's `.env.local`.

---

## Service-to-Service Auth

App-to-app calls (not user-initiated) use `X-Service-Key`:

```typescript
// In any app calling Core:
fetch(`${KENUXA_CORE_URL}/api/wallet`, {
  headers: {
    'X-Service-Key': process.env.KENUXA_CORE_API_KEY,
    'X-App': 'reach',
  }
})
```

Core validates: `serviceKey === process.env.KENUXA_CORE_API_KEY`

---

## Roles & Permissions

Roles are defined ecosystem-wide and enforced by Core:

| Role | Level | Capabilities |
|---|---|---|
| `super_admin` | 0 | Full access to everything |
| `organization_owner` | 1 | Full org control |
| `organization_admin` | 2 | Manage org members |
| `operator` | 3 | Run campaigns and workflows |
| `analyst` | 4 | Read intelligence, run reports |
| `contributor` | 5 | Add data, contribute |
| `viewer` | 6 | Read-only |

---

## Setting Up Auth in a New App

1. **Share the same Supabase project** as Core (same `NEXT_PUBLIC_SUPABASE_URL`)
2. **Copy `JWT_SECRET`** — same value in all apps
3. **Set `KENUXA_CORE_API_KEY`** — for service-to-service calls
4. **Initialize SDK**:

```typescript
// lib/kenuxa.ts
import { initAuthClient } from '@kenuxa/auth'
initAuthClient({ coreUrl: process.env.KENUXA_CORE_URL!, serviceKey: process.env.KENUXA_CORE_API_KEY!, app: 'reach' })
```

5. **Validate tokens in API routes**:

```typescript
import { getAuthClient } from '@kenuxa/auth'

export async function GET(req: NextRequest) {
  const auth = getAuthClient()
  const ctx = await auth.getContext(req.headers.get('authorization'))
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ctx.userId, ctx.organizationId, ctx.role available
}
```

---

## Middleware Pattern

```typescript
// middleware.ts in each app
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/verify-email', '/auth/callback']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  return NextResponse.next()
}
```
