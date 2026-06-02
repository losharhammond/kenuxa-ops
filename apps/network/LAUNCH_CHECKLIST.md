# KENUXA Business Network — Production Launch Checklist

## Database Migrations (Run in Supabase SQL Editor — in order)
- [ ] Phase 12 — Core tables (user_profiles, businesses, etc.)
- [ ] Phase 13 — Marketplace, jobs, freelancers
- [ ] Phase 14 — Delivery, suppliers, CRM
- [ ] Phase 15 — Sales, inventory, POS
- [ ] **Phase 16** — `supabase/phase16_treasury_exchange.sql` (wallets, KENUX, treasury, RPCs)

## Supabase Storage Buckets
- [ ] Create bucket: `kyc-documents` (private, 10MB limit, PDF/JPEG/PNG)
- [ ] Create bucket: `business-assets` (public, 5MB limit, images)
- [ ] Create bucket: `product-images` (public, 5MB limit, images)

## Environment Variables (Vercel → Project → Settings → Environment Variables)
### Required for launch:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL=https://network.kenuxa.com`
- [ ] `KENUX_PER_GHS=10`
- [ ] `KENUX_WELCOME_BONUS=500`
- [ ] `PAYSTACK_SECRET_KEY=sk_live_...`
- [ ] `PAYSTACK_PUBLIC_KEY=pk_live_...`
- [ ] `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...`
- [ ] `PAYSTACK_WEBHOOK_SECRET`
- [ ] `GROQ_API_KEY`
- [ ] `CRON_SECRET`
- [ ] `EXCHANGE_RATES_API_KEY` (openexchangerates.org)
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_AUTH_TOKEN`

### Optional (enhanced features):
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (distributed cache)
- [ ] `SMILE_PARTNER_ID` + `SMILE_API_KEY` (KYC verification)
- [ ] `RESEND_API_KEY` (email notifications)
- [ ] `ARKESEL_API_KEY` (SMS — Ghana)

## Paystack Configuration
- [ ] Configure webhook URL in Paystack dashboard:
  `https://network.kenuxa.com/api/payments/paystack/webhook`
- [ ] Enable events: `charge.success`, `transfer.success`, `transfer.failed`,
  `subscription.create`, `subscription.disable`, `invoice.update`, `invoice.payment_failed`
- [ ] Verify test transactions before go-live
- [ ] Switch to live keys (not test keys)

## Vercel Deployment
- [ ] Connect GitHub repo → Vercel project
- [ ] Set root directory: `apps/network`
- [ ] Framework: Next.js (auto-detected)
- [ ] Build command: `pnpm build` (or `next build`)
- [ ] Configure custom domain: `network.kenuxa.com`
- [ ] SSL certificate auto-provisioned by Vercel
- [ ] Cron jobs activate automatically from `vercel.json`

## Pre-Launch Verification
- [ ] Register a test user → wallet + KENUX bonus provisioned
- [ ] Complete onboarding flow for each role type
- [ ] Top up wallet via Paystack (test card)
- [ ] Purchase KENUX via Paystack
- [ ] Transfer wallet balance between two test users
- [ ] Post a job listing as business_owner
- [ ] Apply to job as job_seeker
- [ ] Submit KYC document
- [ ] Check admin dashboard at /admin
- [ ] Verify NOC dashboard at /admin/noc
- [ ] Verify treasury dashboard at /dashboard/treasury
- [ ] Check notification bell (unread count updates)
- [ ] Verify rate limiting (>10 auth requests in 1 min → 429)
- [ ] Confirm KENUX rate is 10 KENUX = GH₵ 1.00 everywhere

## KENUX Economy Rules (NEVER CHANGE)
- KENUX is NOT cryptocurrency
- KENUX is NOT blockchain
- KENUX is NOT speculative
- Fixed rate: 10 KENUX = GH₵ 1.00 (env: KENUX_PER_GHS=10)
- Balances are ledger-driven (never summed from transactions)
- Welcome bonus: 500 KENUX per new registration
