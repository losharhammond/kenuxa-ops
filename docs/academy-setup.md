# KENUXA ACADEMY — Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- Access to the KENUXA Supabase project (same one as KENUXA NETWORK)
- PostgreSQL DB for Academy-specific tables (can use Supabase Transaction Pooler)

---

## Key Principle: Shared Auth

KENUXA ACADEMY shares the **same Supabase project** as KENUXA NETWORK.  
A user who registers on Network can sign in to Academy with the exact same email + password — no new account needed.

---

## 1. Install dependencies

```bash
cd C:\Users\HomePC\Desktop\KENUXA
pnpm install
```

---

## 2. Configure Identity Service

```bash
cd services/identity-service
cp .env.example .env
```

Fill in `.env`:
```env
# Academy-specific tables (can reuse Supabase Transaction Pooler URL)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-xx.pooler.supabase.com:6543/postgres"

# SAME Supabase project as Network
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"   # Supabase Project > Settings > API > JWT Secret

# KENUXA CORE for wallet data
KENUXA_CORE_URL="http://localhost:3000"

PORT=4001
CORS_ORIGIN="http://localhost:3003"
```

---

## 3. Run Prisma migrations

```bash
cd services/identity-service
pnpm db:generate
pnpm db:migrate
```

Creates three tables in your database:
- `academy_user_meta` — Academy role for each Supabase user (auto-created on first login)
- `academy_profiles` — fullName, bio, location, interests[], goals[], metadata
- `academy_identity_states` — 7 dimension scores (0–100 each)

---

## 4. Configure Academy Web App

```bash
cd apps/academy
cp .env.example .env.local
```

Fill in `.env.local`:
```env
# SAME values as Network
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

NEXT_PUBLIC_IDENTITY_URL="http://localhost:4001"
NEXT_PUBLIC_APP_URL="http://localhost:3003"
```

---

## 5. Start services

```bash
# Terminal 1 — Identity Service
cd services/identity-service && pnpm dev

# Terminal 2 — Academy Web App
cd apps/academy && pnpm dev
```

---

## 6. Cross-app access flow

```
User registers at Network (port 3002)
         ↓
User visits Academy (port 3003) → clicks "Sign In"
         ↓
Enter Network email + password → Supabase Auth
         ↓
Supabase issues JWT (same secret across ecosystem)
         ↓
Academy auto-provisions academy_user_meta + profile + identity_state
         ↓
Dashboard shows:  Identity scores  |  KENUX wallet balance (from Core)
```

---

## 7. Verify

**Identity service health:**
```
GET http://localhost:4001/health
→ { "status": "ok", "service": "identity-service", "app": "academy" }
```

**Register / Login:**
```bash
# Register
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'

# Login (works with Network credentials too)
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Use access_token to call protected endpoints:**
```bash
TOKEN="<access_token from login response>"
curl http://localhost:4001/profile -H "Authorization: Bearer $TOKEN"
curl http://localhost:4001/identity/state -H "Authorization: Bearer $TOKEN"
curl http://localhost:4001/wallet/balance -H "Authorization: Bearer $TOKEN"
```

---

## Ports

| Service           | Port |
|-------------------|------|
| KENUXA CORE       | 3000 |
| KENUXA NETWORK    | 3002 |
| KENUXA ACADEMY    | 3003 |
| Identity Service  | 4001 |
