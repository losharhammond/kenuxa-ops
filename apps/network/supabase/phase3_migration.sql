-- =============================================================================
-- KENUXA PHASE 3 MIGRATION — Economic OS New Tables
-- Run after migration.sql
-- =============================================================================

-- ─── 32. BUSINESSES: logo & banner URLs ──────────────────────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS logo_url    TEXT,
  ADD COLUMN IF NOT EXISTS banner_url  TEXT,
  ADD COLUMN IF NOT EXISTS category    TEXT;

-- Back-fill category from business_type
UPDATE businesses SET category = business_type WHERE category IS NULL AND business_type IS NOT NULL;

-- ─── 33. FREELANCER_PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancer_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id),
  full_name       TEXT NOT NULL,
  headline        TEXT,
  bio             TEXT,
  skills          TEXT[] DEFAULT '{}',
  hourly_rate     NUMERIC(10,2),
  location        TEXT,
  availability    TEXT NOT NULL DEFAULT 'available',
  languages       TEXT[] DEFAULT '{English}',
  linkedin_url    TEXT,
  portfolio_url   TEXT,
  avatar_url      TEXT,
  verified        BOOLEAN NOT NULL DEFAULT false,
  rating          NUMERIC(3,2),
  reviews_count   INT NOT NULL DEFAULT 0,
  completed_jobs  INT NOT NULL DEFAULT 0,
  kenuxa_score    INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE freelancer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Freelancers are public" ON freelancer_profiles;
DROP POLICY IF EXISTS "Users manage own profile" ON freelancer_profiles;
CREATE POLICY "Freelancers are public"    ON freelancer_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile"  ON freelancer_profiles FOR ALL    USING (auth.uid() = user_id);

-- ─── 34. FREELANCER_PACKAGES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancer_packages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id    UUID REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  freelancer_name  TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
  price            NUMERIC(10,2) NOT NULL,
  delivery_days    INT,
  rating           NUMERIC(3,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE freelancer_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Packages are public" ON freelancer_packages;
DROP POLICY IF EXISTS "Freelancers manage packages" ON freelancer_packages;
CREATE POLICY "Packages are public" ON freelancer_packages FOR SELECT USING (true);
CREATE POLICY "Freelancers manage packages" ON freelancer_packages FOR ALL USING (
  EXISTS (SELECT 1 FROM freelancer_profiles fp WHERE fp.id = freelancer_id AND fp.user_id = auth.uid())
);

-- ─── 35. FREELANCE_REQUESTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelance_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  budget       NUMERIC(10,2),
  deadline     DATE,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE freelance_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open requests visible" ON freelance_requests;
DROP POLICY IF EXISTS "Businesses manage requests" ON freelance_requests;
CREATE POLICY "Open requests visible" ON freelance_requests FOR SELECT
  USING (status = 'open' OR business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "Businesses manage requests" ON freelance_requests FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));

-- ─── 36. WORK_EXPERIENCE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_experience (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  company     TEXT NOT NULL DEFAULT '',
  start_date  DATE,
  end_date    DATE,
  current     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own experience" ON work_experience;
CREATE POLICY "Users manage own experience" ON work_experience FOR ALL USING (auth.uid() = user_id);

-- ─── 37. EDUCATION ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS education (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  degree      TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  year        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE education ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own education" ON education;
CREATE POLICY "Users manage own education" ON education FOR ALL USING (auth.uid() = user_id);

-- ─── 38. COMMUNITY_POSTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID REFERENCES auth.users(id),
  author_name      TEXT NOT NULL,
  author_avatar    TEXT,
  author_role      TEXT,
  author_business  TEXT,
  content          TEXT NOT NULL,
  post_type        TEXT NOT NULL DEFAULT 'update',
  likes_count      INT NOT NULL DEFAULT 0,
  comments_count   INT NOT NULL DEFAULT 0,
  shares_count     INT NOT NULL DEFAULT 0,
  image_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts are public" ON community_posts;
DROP POLICY IF EXISTS "Auth users can post" ON community_posts;
DROP POLICY IF EXISTS "Authors can update" ON community_posts;
CREATE POLICY "Posts are public"    ON community_posts FOR SELECT USING (true);
CREATE POLICY "Auth users can post" ON community_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authors can update"  ON community_posts FOR UPDATE USING (auth.uid() = author_id);

-- ─── 39. POST_COMMENTS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES auth.users(id),
  author_name  TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments are public" ON post_comments;
DROP POLICY IF EXISTS "Auth users can comment" ON post_comments;
CREATE POLICY "Comments are public"   ON post_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can comment" ON post_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 40. POST_LIKES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  post_id   UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Likes are public" ON post_likes;
DROP POLICY IF EXISTS "Auth users manage likes" ON post_likes;
CREATE POLICY "Likes are public"       ON post_likes FOR SELECT USING (true);
CREATE POLICY "Auth users manage likes" ON post_likes FOR ALL    USING (auth.uid() = user_id);

-- Toggle like RPC
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID, p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM post_likes WHERE post_id = p_post_id AND user_id = p_user_id) THEN
    DELETE FROM post_likes WHERE post_id = p_post_id AND user_id = p_user_id;
    UPDATE community_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_post_id;
  ELSE
    INSERT INTO post_likes (post_id, user_id) VALUES (p_post_id, p_user_id);
    UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = p_post_id;
  END IF;
END;
$$;

-- Update comments count trigger
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_insert ON post_comments;
CREATE TRIGGER on_comment_insert
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION increment_comments_count();

-- ─── 41. LOYALTY_POINTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_points (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points           INT NOT NULL DEFAULT 0,
  lifetime_points  INT NOT NULL DEFAULT 0,
  tier             TEXT NOT NULL DEFAULT 'bronze',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own points" ON loyalty_points;
DROP POLICY IF EXISTS "System updates points" ON loyalty_points;
CREATE POLICY "Users see own points"  ON loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System updates points" ON loyalty_points FOR ALL    USING (auth.uid() = user_id);

-- ─── 42. LOYALTY_TRANSACTIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points       INT NOT NULL,
  type         TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own transactions" ON loyalty_transactions;
DROP POLICY IF EXISTS "System inserts transactions" ON loyalty_transactions;
CREATE POLICY "Users see own transactions" ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts transactions" ON loyalty_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 43. STORAGE BUCKETS (run in Supabase Dashboard or via Management API) ───
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('business-assets', 'business-assets', true),
--   ('profiles', 'profiles', true),
--   ('products', 'products', true),
--   ('community', 'community', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies (after creating buckets):
-- CREATE POLICY "Public read business assets"
--   ON storage.objects FOR SELECT USING (bucket_id = 'business-assets');
-- CREATE POLICY "Auth users upload business assets"
--   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-assets' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "Public read profiles"
--   ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
-- CREATE POLICY "Auth users upload profiles"
--   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "Auth users update own files"
--   ON storage.objects FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ─── 44. GRANT PHASE 3 TABLES ────────────────────────────────────────────────
GRANT ALL ON freelancer_profiles, freelancer_packages, freelance_requests TO authenticated;
GRANT ALL ON work_experience, education TO authenticated;
GRANT ALL ON community_posts, post_comments, post_likes TO authenticated;
GRANT ALL ON loyalty_points, loyalty_transactions TO authenticated;
GRANT SELECT ON freelancer_profiles, freelancer_packages, community_posts, post_comments TO anon;
