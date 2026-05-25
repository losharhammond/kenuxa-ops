-- ═══════════════════════════════════════════════════════════════════════════
-- KENUXA OPS — Phase 6: Device Registry + Schema Fixes
-- ═══════════════════════════════════════════════════════════════════════════
--
-- SAFE TO RUN ON ANY STATE:
--   • Fresh project (no prior migrations)
--   • After migration 001 only
--   • After migrations 001 + 002
--
-- Every statement uses IF NOT EXISTS / DO blocks to be fully idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ops_devices — Desktop Agent auto-pairing registry ─────────────────────

CREATE TABLE IF NOT EXISTS ops_devices (
  id             TEXT        PRIMARY KEY,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  platform       TEXT        NOT NULL
                 CHECK (platform IN ('windows','macos','linux')),
  version        TEXT        NOT NULL DEFAULT '1.0.0',
  status         TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','offline','degraded','unsynced')),
  capabilities   JSONB       NOT NULL DEFAULT '["browser","filesystem","notify"]',
  fingerprint    TEXT        NOT NULL,
  ip_address     TEXT,
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paired_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ops_devices_user_idx
  ON ops_devices(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS ops_devices_status_idx
  ON ops_devices(user_id, status);

ALTER TABLE ops_devices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ops_devices' AND policyname = 'ops_devices_user_policy'
  ) THEN
    CREATE POLICY "ops_devices_user_policy" ON ops_devices
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ops_devices' AND policyname = 'ops_devices_service_policy'
  ) THEN
    CREATE POLICY "ops_devices_service_policy" ON ops_devices
      FOR ALL TO service_role USING (true);
  END IF;
END $$;


-- ── 2. ops_memory — fix schema for Phase 4 memory agent ─────────────────────
--
-- Migration 001 created ops_memory WITHOUT:
--   • plan_id column   (needed by memory agent)
--   • UNIQUE(user_id, key)  (needed for upsert onConflict)
--
-- This block safely adds the missing pieces to the EXISTING table.
-- If the table doesn't exist yet it creates it from scratch.

CREATE TABLE IF NOT EXISTS ops_memory (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'context',
  plan_id    TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add plan_id column to existing table if missing (migration 001 didn't have it)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'ops_memory'
      AND column_name  = 'plan_id'
  ) THEN
    ALTER TABLE ops_memory ADD COLUMN plan_id TEXT;
  END IF;
END $$;

-- Widen the type CHECK constraint to include Phase 4 types
-- (migration 001 only allows fact/preference/context/entity/workflow/contact)
DO $$ BEGIN
  -- Drop the old restrictive CHECK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ops_memory'::regclass
      AND contype  = 'c'
      AND conname LIKE '%type%'
  ) THEN
    ALTER TABLE ops_memory DROP CONSTRAINT IF EXISTS ops_memory_type_check;
    ALTER TABLE ops_memory DROP CONSTRAINT IF EXISTS ops_memory_check;
  END IF;

  -- Add the widened CHECK constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ops_memory'::regclass
      AND contype  = 'c'
      AND conname  = 'ops_memory_type_check_v2'
  ) THEN
    ALTER TABLE ops_memory
      ADD CONSTRAINT ops_memory_type_check_v2
      CHECK (type IN (
        'fact','preference','context','entity','workflow','contact',
        'execution_log','system'
      ));
  END IF;
END $$;

-- Repair NULL keys so we can add the UNIQUE constraint
UPDATE ops_memory
SET key = 'legacy:' || id::text
WHERE key IS NULL;

-- Add UNIQUE(user_id, key) constraint if missing
-- The memory agent's upsert uses onConflict: 'user_id,key'
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ops_memory'::regclass
      AND contype   = 'u'
      AND conname LIKE '%user%key%'
  ) THEN
    -- Remove any duplicate (user_id, key) rows that would block the constraint
    DELETE FROM ops_memory a
    USING ops_memory b
    WHERE a.ctid > b.ctid
      AND a.user_id = b.user_id
      AND a.key     = b.key;

    ALTER TABLE ops_memory
      ADD CONSTRAINT ops_memory_user_key_unique UNIQUE (user_id, key);
  END IF;
END $$;

-- Create the indexes the memory agent relies on
CREATE INDEX IF NOT EXISTS ops_memory_user_updated_idx
  ON ops_memory(user_id, updated_at DESC);

ALTER TABLE ops_memory ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ops_memory' AND policyname = 'ops_memory_user_policy'
  ) THEN
    CREATE POLICY "ops_memory_user_policy" ON ops_memory
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── 3. ops_executions — created by 002, add missing index safely ─────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ops_executions'
  ) THEN
    -- safe to create the index; table exists
    EXECUTE 'CREATE INDEX IF NOT EXISTS ops_executions_goal_idx
             ON ops_executions(user_id, goal)';
  END IF;
END $$;


-- ── 4. ops_metrics — performance tracking ────────────────────────────────────

CREATE TABLE IF NOT EXISTS ops_metrics (
  id          BIGSERIAL        PRIMARY KEY,
  user_id     UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric      TEXT             NOT NULL,
  value       DOUBLE PRECISION NOT NULL DEFAULT 0,
  labels      JSONB            NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ops_metrics_user_metric_idx
  ON ops_metrics(user_id, metric, recorded_at DESC);

ALTER TABLE ops_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ops_metrics' AND policyname = 'ops_metrics_user_policy'
  ) THEN
    CREATE POLICY "ops_metrics_user_policy" ON ops_metrics
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── 5. microsoft_tokens — Outlook OAuth2 tokens (Phase 4) ───────────────────

CREATE TABLE IF NOT EXISTS microsoft_tokens (
  user_id       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  scope         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE microsoft_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'microsoft_tokens' AND policyname = 'microsoft_tokens_user_policy'
  ) THEN
    CREATE POLICY "microsoft_tokens_user_policy" ON microsoft_tokens
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
