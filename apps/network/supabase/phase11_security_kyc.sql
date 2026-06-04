-- ============================================================
-- Phase 11: Security Events Enhancement + KYC Storage
-- ============================================================

-- ── PREREQUISITE: ensure audit_logs has extended columns ────────────────────
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS category   TEXT NOT NULL DEFAULT 'general';
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS severity   TEXT NOT NULL DEFAULT 'info';
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS actor      TEXT;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS actor_id   UUID;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS target     TEXT;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS target_id  UUID;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Ensure security_events has required columns
ALTER TABLE IF EXISTS security_events
  ADD COLUMN IF NOT EXISTS ip_address  text,
  ADD COLUMN IF NOT EXISTS user_agent  text,
  ADD COLUMN IF NOT EXISTS event_type  text,
  ADD COLUMN IF NOT EXISTS severity    text DEFAULT 'info';

-- Ensure kyc_documents has reviewed_at and rejection_reason
ALTER TABLE IF EXISTS kyc_documents
  ADD COLUMN IF NOT EXISTS side              text DEFAULT 'front',
  ADD COLUMN IF NOT EXISTS file_path         text,
  ADD COLUMN IF NOT EXISTS file_url          text,
  ADD COLUMN IF NOT EXISTS submitted_at      timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by       uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason  text;

-- Unique constraint so upsert works
-- Handle both column names: doc_type (phase7/8/9) and document_type (phase16)
DO $$
BEGIN
  -- Standardize: if only doc_type exists, add document_type as an alias
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='kyc_documents' AND column_name='doc_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='kyc_documents' AND column_name='document_type'
  ) THEN
    ALTER TABLE kyc_documents ADD COLUMN document_type TEXT;
    UPDATE kyc_documents SET document_type = doc_type WHERE document_type IS NULL;
  END IF;
  
  -- Ensure side column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='kyc_documents' AND column_name='side'
  ) THEN
    ALTER TABLE kyc_documents ADD COLUMN side TEXT DEFAULT 'front';
  END IF;

  -- Drop old constraint if exists
  ALTER TABLE kyc_documents DROP CONSTRAINT IF EXISTS kyc_documents_user_doc_side_unique;

  -- Add constraint using whichever column name exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='kyc_documents' AND column_name='document_type'
  ) THEN
    ALTER TABLE kyc_documents
      ADD CONSTRAINT kyc_documents_user_doc_side_unique
      UNIQUE (user_id, document_type, side);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='kyc_documents' AND column_name='doc_type'
  ) THEN
    ALTER TABLE kyc_documents
      ADD CONSTRAINT kyc_documents_user_doc_side_unique
      UNIQUE (user_id, doc_type, side);
  END IF;
END;
$$;

-- Ensure subscriptions.updated_at column exists
ALTER TABLE IF EXISTS subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ── Supabase Storage: kyc-documents bucket ────────────────────
-- Run this in Supabase dashboard Storage > New bucket
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'kyc-documents', 'kyc-documents', false, 5242880,
--   ARRAY['image/jpeg','image/png','image/webp','application/pdf']
-- ) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only owners + admins
-- CREATE POLICY "kyc_owner_access" ON storage.objects FOR ALL
--   USING (
--     bucket_id = 'kyc-documents' AND (
--       auth.uid()::text = (storage.foldername(name))[2]
--       OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
--     )
--   );

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_security_events_user    ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type    ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user      ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status    ON kyc_documents(status);

-- ── Fraud Detection View ──────────────────────────────────────
CREATE OR REPLACE VIEW fraud_signals AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE event_type = 'mfa_failed')       AS mfa_failures,
  COUNT(*) FILTER (WHERE event_type = 'login_failed')     AS login_failures,
  COUNT(*) FILTER (WHERE severity = 'critical')           AS critical_events,
  MAX(created_at)                                          AS last_event,
  COUNT(DISTINCT ip_address)                               AS unique_ips
FROM security_events
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY user_id
HAVING
  COUNT(*) FILTER (WHERE event_type = 'mfa_failed') > 5
  OR COUNT(*) FILTER (WHERE event_type = 'login_failed') > 10
  OR COUNT(*) FILTER (WHERE severity = 'critical') > 0;

-- ── Auto-suspend on repeated failures (trigger) ───────────────
CREATE OR REPLACE FUNCTION check_fraud_signals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  failure_count integer;
BEGIN
  IF NEW.event_type IN ('mfa_failed', 'login_failed') THEN
    SELECT COUNT(*) INTO failure_count
    FROM security_events
    WHERE user_id = NEW.user_id
      AND event_type = NEW.event_type
      AND created_at > now() - INTERVAL '1 hour';

    -- Auto-flag account after 10 failures in 1 hour
    IF failure_count >= 10 THEN
      INSERT INTO audit_logs (action, category, severity, actor, target, metadata)
      VALUES (
        'account_flagged_fraud_suspicion',
        'security',
        'critical',
        'system',
        NEW.user_id::text,
        jsonb_build_object('failure_count', failure_count, 'event_type', NEW.event_type)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_security_event ON security_events;
CREATE TRIGGER on_security_event
  AFTER INSERT ON security_events
  FOR EACH ROW EXECUTE FUNCTION check_fraud_signals();
