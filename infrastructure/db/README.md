# KENUXA — Database Infrastructure

## Academy Database (local dev)

```bash
# Start local Postgres for Academy identity-service
docker compose -f infrastructure/db/docker-compose.academy.yml up -d

# Connection string for services/identity-service/.env:
# DATABASE_URL="postgresql://academy:academy_dev_password@localhost:5433/kenuxa_academy"
```

## Run Prisma migrations

```bash
cd services/identity-service
pnpm db:migrate     # dev (creates migration files)
pnpm db:migrate:prod  # production (applies existing migrations)
```

## Using Supabase instead

If you use the same Supabase project as KENUXA NETWORK:

1. Go to Supabase Dashboard → Settings → Database → Connection Pooling
2. Copy the Transaction Pooler URL (port 6543)
3. Set `DATABASE_URL` in `services/identity-service/.env`

This keeps all KENUXA data in one Supabase project.
