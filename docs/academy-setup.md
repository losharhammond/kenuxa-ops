# KENUXA ACADEMY — Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ running locally (or Supabase project)

---

## 1. Install dependencies

```bash
cd C:\Users\HomePC\Desktop\KENUXA
pnpm install
```

---

## 2. Configure the Identity Service

```bash
cd services/identity-service
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kenuxa_academy"
JWT_SECRET="your-32-char-minimum-secret-here"
PORT=4001
CORS_ORIGIN="http://localhost:3003"
```

---

## 3. Run database migrations

```bash
cd services/identity-service
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Create tables (dev migration)
```

This creates three tables:
- `academy_users`
- `academy_profiles`
- `academy_identity_states`

---

## 4. Configure the Academy web app

```bash
cd apps/academy
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_IDENTITY_URL="http://localhost:4001"
JWT_SECRET="same-secret-as-identity-service"
```

---

## 5. Run both services

**Option A — run individually:**
```bash
# Terminal 1
cd services/identity-service
pnpm dev

# Terminal 2
cd apps/academy
pnpm dev
```

**Option B — run from monorepo root:**
```bash
cd C:\Users\HomePC\Desktop\KENUXA
pnpm --filter @kenuxa/identity-service dev
pnpm --filter @kenuxa/academy dev
```

---

## 6. Verify

- Identity service: http://localhost:4001/health
- Academy web app: http://localhost:3003

Test registration:
```bash
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'
```

---

## Ports

| Service          | Port |
|------------------|------|
| KENUXA CORE      | 3000 |
| KENUXA NETWORK   | 3002 |
| KENUXA ACADEMY   | 3003 |
| Identity Service | 4001 |
