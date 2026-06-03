-- ============================================================
-- KENUXA Phase 17 — Referral System & Phone Auth Support
-- Run AFTER phase16_treasury_exchange.sql
-- ============================================================

-- ── Referral code column on user_profiles ─────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Auto-generate a unique referral code when a profile is created/updated
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      -- Format: KNX-XXXX (6 uppercase alphanumeric chars after prefix)
      v_code := 'KNX-' || upper(substring(md5(NEW.id::text || now()::text || random()::text) from 1 for 6));
      SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    NEW.referral_code := v_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_code ON user_profiles;
CREATE TRIGGER trg_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- Back-fill existing profiles that have no referral code
DO $$
DECLARE
  r RECORD;
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM user_profiles WHERE referral_code IS NULL LOOP
    LOOP
      v_code := 'KNX-' || upper(substring(md5(r.id::text || now()::text || random()::text) from 1 for 6));
      SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    UPDATE user_profiles SET referral_code = v_code WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── Referrals tracking table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referee_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  referral_code    TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'   CHECK (status IN ('pending', 'completed', 'expired', 'fraud')),
  bonus_credited   BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,

  UNIQUE(referee_id) -- one referral per new user
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code     ON referrals(referral_code);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own referrals (as referrer)" ON referrals;
CREATE POLICY "Users see own referrals (as referrer)" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Service role full access referrals" ON referrals;
CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

-- ── Phone number column (supplement to auth.users phone) ──────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

-- ── Referral leaderboard view ──────────────────────────────────
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT
  r.referrer_id,
  up.full_name,
  up.referral_code,
  COUNT(*)                                  AS total_referrals,
  COUNT(*) FILTER (WHERE r.status = 'completed') AS successful_referrals,
  COUNT(*) * 250                            AS kenux_earned -- 250 KENUX per referral
FROM referrals r
JOIN user_profiles up ON up.id = r.referrer_id
GROUP BY r.referrer_id, up.full_name, up.referral_code
ORDER BY successful_referrals DESC;

GRANT SELECT ON referral_leaderboard TO authenticated, service_role;

COMMENT ON TABLE referrals IS 'Tracks referral relationships for KENUXA referral program. 250 KENUX credited per successful referral.';
