-- ═══════════════════════════════════════════════════════════════════════════
-- KENUXA OPS — Phase 2: Execution Pipeline Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Execution Plans ────────────────────────────────────────────────────────────
-- Each entry is one complete multi-step execution run.

CREATE TABLE ops_executions (
  id           TEXT        PRIMARY KEY,          -- nanoid(12) from client
  user_id      UUID        NOT NULL,
  goal         TEXT        NOT NULL,             -- the original natural-language goal
  raw_text     TEXT        NOT NULL,
  steps        JSONB       NOT NULL DEFAULT '[]',
  -- steps: [{ id, index, type, label, tool, input, output, status, error, durationMs, startedAt, completedAt }]
  status       TEXT        NOT NULL DEFAULT 'planning'
               CHECK (status IN ('planning','executing','completed','failed','cancelled')),
  current_step INT         NOT NULL DEFAULT 0,
  result       JSONB,
  error        TEXT,
  source       TEXT        NOT NULL DEFAULT 'api'
               CHECK (source IN ('voice','api','scheduled','automation')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms  INT
);

CREATE INDEX ops_executions_user_idx    ON ops_executions(user_id, started_at DESC);
CREATE INDEX ops_executions_status_idx  ON ops_executions(user_id, status);

-- ── RLS ─────────────────────────────────────────────────────────────────────────
ALTER TABLE ops_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_executions_user_policy" ON ops_executions
  FOR ALL USING (auth.uid() = user_id);

-- ── Add execution engine plugin to seed data ─────────────────────────────────
INSERT INTO ops_plugins (name, display_name, description, version, author, category, is_built_in, manifest)
VALUES (
  'execution_engine',
  'Execution Engine',
  'AI-driven multi-step task decomposition and execution pipeline',
  '2.0.0',
  'KENUXA',
  'automation',
  TRUE,
  '{"commands":["execute_goal","decompose_task","run_pipeline"],"triggers":["voice.complex_goal","api.execute"]}'
)
ON CONFLICT (name) DO UPDATE SET version = '2.0.0', manifest = EXCLUDED.manifest;
