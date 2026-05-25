# KENUXA CORE Phase 1 Architecture

KENUXA CORE is a headless-first infrastructure platform. Products such as KENUXA REACH, KENUXA VOICE, and KENUXA Academy remain separate applications and communicate with CORE through APIs, shared auth, events, webhooks, and shared memory.

## Phase 1 Boundaries

- Authentication and session foundation with JWTs, refresh-token flow, middleware, and Supabase Auth integration.
- Organization-scoped tenancy with memberships, roles, quotas, API limits, and usage metrics.
- Postgres-backed event bus with durable logs, retries, subscriptions, and webhook logging.
- AI orchestration layer with Groq-first model routing and a provider boundary for Ollama/local adapters later.
- Persistent memory and vector storage using Supabase Postgres plus pgvector.
- Knowledge graph tables for people, businesses, communities, datasets, campaigns, signals, markets, and relationships.
- Automation engine foundation with triggers, conditions, actions, schedules, and run logs.
- Integration registry for WhatsApp, Telegram, email, SMS, browser extensions, desktop/mobile apps, crawlers, and AI agents.

## Free Stack

- Next.js App Router, TypeScript, Tailwind CSS.
- Supabase Postgres, Auth, Storage, Realtime, RLS, and pgvector.
- Groq for initial hosted AI inference.
- Resend primary email path, SMTP-compatible fallback.
- Vercel hosting and Vercel Cron for low-cost scheduling.

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase and provider keys.

```bash
npm install
npm run dev
```

Apply the Supabase schema from `supabase/schema.sql` in the Supabase SQL editor or through the Supabase CLI.

## API Surface

- `/api/auth/*`
- `/api/organizations/*`
- `/api/events/*`
- `/api/ai/*`
- `/api/memory/*`
- `/api/workflows/*`
- `/api/integrations/*`
- `/api/graph/*`
- `/api/analytics/*`

## Production Notes

- Keep service-role Supabase keys server-only.
- Enable RLS before public usage.
- Hash API keys before storage.
- Store integration secrets in Supabase Vault or a Vercel encrypted environment path.
- Use organization IDs in every product-to-CORE request.
