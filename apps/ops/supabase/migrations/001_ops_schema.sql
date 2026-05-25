-- ═══════════════════════════════════════════════════════════════════════════
-- KENUXA OPS — Database Schema
-- All tables prefixed with ops_ to avoid conflicts in shared Supabase project
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable extensions ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Voice Sessions ─────────────────────────────────────────────────────────────
CREATE TABLE ops_voice_sessions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL,  -- references auth.users
  wake_word         TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INT         GENERATED ALWAYS AS (
                      EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INT
                    ) STORED,
  commands_executed INT         NOT NULL DEFAULT 0,
  full_transcript   TEXT,
  status            TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'ended', 'error')),
  metadata          JSONB       NOT NULL DEFAULT '{}'
);

-- ── Commands ───────────────────────────────────────────────────────────────────
CREATE TABLE ops_commands (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL,
  session_id   UUID        REFERENCES ops_voice_sessions(id) ON DELETE SET NULL,
  raw_text     TEXT        NOT NULL,
  intent       TEXT,
  confidence   FLOAT,
  entities     JSONB       NOT NULL DEFAULT '{}',
  handler      TEXT,       -- which handler processed this
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','executing','completed','failed','cancelled')),
  result       JSONB,
  speak_text   TEXT,       -- what was spoken back to user
  error        TEXT,
  execution_ms INT,
  source       TEXT        NOT NULL DEFAULT 'voice'
               CHECK (source IN ('voice','api','scheduled','automation')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_commands_user_id_idx  ON ops_commands(user_id);
CREATE INDEX ops_commands_session_idx  ON ops_commands(session_id);
CREATE INDEX ops_commands_created_idx  ON ops_commands(created_at DESC);

-- ── Conversations ──────────────────────────────────────────────────────────────
CREATE TABLE ops_conversations (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL,
  session_id UUID        REFERENCES ops_voice_sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
  content    TEXT        NOT NULL,
  audio_url  TEXT,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_conversations_session_idx ON ops_conversations(session_id);
CREATE INDEX ops_conversations_user_idx    ON ops_conversations(user_id, created_at DESC);

-- ── Memory Entries ────────────────────────────────────────────────────────────
CREATE TABLE ops_memory (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL,
  org_id     TEXT,       -- KENUXA CORE org id
  type       TEXT        NOT NULL
             CHECK (type IN ('fact','preference','context','entity','workflow','contact')),
  key        TEXT,
  value      TEXT        NOT NULL,
  importance FLOAT       NOT NULL DEFAULT 0.5,
  access_count INT       NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_memory_user_idx  ON ops_memory(user_id, type);
CREATE INDEX ops_memory_key_idx   ON ops_memory(user_id, key);

-- ── Workflows ──────────────────────────────────────────────────────────────────
CREATE TABLE ops_workflows (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL,
  name             TEXT        NOT NULL,
  description      TEXT,
  trigger_type     TEXT        NOT NULL
                   CHECK (trigger_type IN ('cron','event','manual','voice','webhook')),
  trigger_config   JSONB       NOT NULL DEFAULT '{}',
  -- trigger_config examples:
  --   cron:    { "expression": "0 8 * * *" }
  --   event:   { "event_type": "email.received", "filters": {} }
  --   voice:   { "phrases": ["run morning report"] }
  steps            JSONB       NOT NULL DEFAULT '[]',
  -- steps: [{ "id": "1", "type": "email|command|wait|condition", "config": {} }]
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  run_count        INT         NOT NULL DEFAULT 0,
  success_count    INT         NOT NULL DEFAULT 0,
  last_run_at      TIMESTAMPTZ,
  last_status      TEXT,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_workflows_user_idx   ON ops_workflows(user_id, is_active);
CREATE INDEX ops_workflows_trigger_idx ON ops_workflows(trigger_type) WHERE is_active = TRUE;

-- ── Workflow Runs ──────────────────────────────────────────────────────────────
CREATE TABLE ops_workflow_runs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id  UUID        NOT NULL REFERENCES ops_workflows(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'running'
               CHECK (status IN ('running','completed','failed','cancelled')),
  trigger      TEXT,
  input        JSONB       NOT NULL DEFAULT '{}',
  output       JSONB       NOT NULL DEFAULT '{}',
  step_results JSONB       NOT NULL DEFAULT '[]',
  error        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms  INT
);

CREATE INDEX ops_workflow_runs_workflow_idx ON ops_workflow_runs(workflow_id, started_at DESC);

-- ── Email Threads (cached from providers) ─────────────────────────────────────
CREATE TABLE ops_email_threads (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL,
  provider         TEXT        NOT NULL CHECK (provider IN ('gmail','outlook')),
  thread_id        TEXT        NOT NULL,
  subject          TEXT,
  participants     TEXT[]      NOT NULL DEFAULT '{}',
  snippet          TEXT,
  is_read          BOOLEAN     NOT NULL DEFAULT FALSE,
  is_important     BOOLEAN     NOT NULL DEFAULT FALSE,
  labels           TEXT[]      NOT NULL DEFAULT '{}',
  message_count    INT         NOT NULL DEFAULT 1,
  ai_summary       TEXT,
  action_items     TEXT[]      NOT NULL DEFAULT '{}',
  sentiment        TEXT        CHECK (sentiment IN ('positive','neutral','negative')),
  last_message_at  TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, thread_id)
);

CREATE INDEX ops_email_threads_user_idx ON ops_email_threads(user_id, last_message_at DESC);

-- ── Tasks ──────────────────────────────────────────────────────────────────────
CREATE TABLE ops_tasks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority    TEXT        NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low','medium','high','urgent')),
  due_date    TIMESTAMPTZ,
  source      TEXT        NOT NULL DEFAULT 'manual'
              CHECK (source IN ('voice','manual','automation','email')),
  command_id  UUID        REFERENCES ops_commands(id) ON DELETE SET NULL,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_tasks_user_idx ON ops_tasks(user_id, status, priority);

-- ── Integrations ───────────────────────────────────────────────────────────────
CREATE TABLE ops_integrations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL,
  type            TEXT        NOT NULL,
  -- type: gmail | outlook | calendar | kenuxa_core | slack | notion
  status          TEXT        NOT NULL DEFAULT 'disconnected'
                  CHECK (status IN ('connected','disconnected','error','pending')),
  display_name    TEXT,
  credentials     JSONB       NOT NULL DEFAULT '{}',
  -- stored as encrypted blob in production
  settings        JSONB       NOT NULL DEFAULT '{}',
  scopes          TEXT[]      NOT NULL DEFAULT '{}',
  last_synced_at  TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- ── Plugins ────────────────────────────────────────────────────────────────────
CREATE TABLE ops_plugins (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT    UNIQUE NOT NULL,
  display_name TEXT    NOT NULL,
  description  TEXT,
  version      TEXT    NOT NULL DEFAULT '1.0.0',
  author       TEXT,
  category     TEXT    CHECK (category IN ('productivity','communication','intelligence','automation','kenuxa')),
  is_built_in  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  manifest     JSONB   NOT NULL DEFAULT '{}',
  -- manifest: { commands: [], triggers: [], settings_schema: {} }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops_plugin_settings (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL,
  plugin_id  UUID    NOT NULL REFERENCES ops_plugins(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  settings   JSONB   NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plugin_id)
);

-- ── Activity Log ───────────────────────────────────────────────────────────────
CREATE TABLE ops_activity_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL,
  type        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon        TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ops_activity_log_user_idx ON ops_activity_log(user_id, created_at DESC);

-- ── Seed built-in plugins ─────────────────────────────────────────────────────
INSERT INTO ops_plugins (name, display_name, description, version, author, category, is_built_in, manifest) VALUES
  ('gmail',         'Gmail',           'Read, send, and manage Gmail messages',          '1.0.0', 'KENUXA', 'communication', TRUE,
   '{"commands":["send_email","read_emails","search_emails","summarize_inbox"],"triggers":["email.received"]}'),
  ('browser',       'Browser Control', 'Control browser tabs, navigate, and automate',   '1.0.0', 'KENUXA', 'automation',    TRUE,
   '{"commands":["open_url","search_web","get_page_content"],"triggers":[]}'),
  ('file_search',   'File Search',     'Search and read local files and documents',      '1.0.0', 'KENUXA', 'productivity',  TRUE,
   '{"commands":["search_files","read_file","list_directory"],"triggers":[]}'),
  ('kenuxa_core',   'KENUXA Core',     'Connect to KENUXA CORE for ecosystem operations','1.0.0', 'KENUXA', 'kenuxa',        TRUE,
   '{"commands":["query_reach","get_intelligence","search_entities"],"triggers":["core.alert"]}'),
  ('calendar',      'Calendar',        'Manage calendar events and reminders',           '1.0.0', 'KENUXA', 'productivity',  TRUE,
   '{"commands":["create_event","list_events","find_free_time"],"triggers":["event.reminder"]}');

-- ── Row-Level Security ─────────────────────────────────────────────────────────
ALTER TABLE ops_voice_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_commands         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_memory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_workflows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_workflow_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_email_threads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_integrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_plugin_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_activity_log     ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ops_voice_sessions','ops_commands','ops_conversations','ops_memory',
    'ops_workflows','ops_workflow_runs','ops_email_threads','ops_tasks',
    'ops_integrations','ops_plugin_settings','ops_activity_log'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%s_user_policy" ON %s FOR ALL USING (auth.uid() = user_id)',
      t, t
    );
  END LOOP;
END $$;
