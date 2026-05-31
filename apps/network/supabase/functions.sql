-- ============================================================
-- KENUXA NETWORK — Supabase stored procedures / RPC functions
-- ============================================================

-- Decrement stock safely (prevents negative stock)
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_qty = GREATEST(0, stock_qty - p_qty)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjust stock by a signed delta (positive = in, negative = out)
CREATE OR REPLACE FUNCTION adjust_stock(p_product_id UUID, p_delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_qty = GREATEST(0, stock_qty + p_delta)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get nearby businesses using PostGIS
CREATE OR REPLACE FUNCTION nearby_businesses(
  lat FLOAT,
  lng FLOAT,
  radius_km FLOAT DEFAULT 5,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  verified BOOLEAN,
  rating FLOAT,
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.type,
    b.city,
    b.address,
    b.phone,
    b.verified,
    b.rating,
    ROUND((ST_Distance(b.location::geography, ST_MakePoint(lng, lat)::geography) / 1000)::numeric, 2)::FLOAT AS distance_km
  FROM businesses b
  WHERE b.location IS NOT NULL
    AND ST_DWithin(b.location::geography, ST_MakePoint(lng, lat)::geography, radius_km * 1000)
    AND b.status = 'active'
  ORDER BY distance_km
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Search businesses with trigram similarity
CREATE OR REPLACE FUNCTION search_businesses(
  p_query TEXT,
  p_city TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS SETOF businesses AS $$
BEGIN
  RETURN QUERY
  SELECT b.*
  FROM businesses b
  WHERE b.status = 'active'
    AND (
      b.name ILIKE '%' || p_query || '%'
      OR b.description ILIKE '%' || p_query || '%'
      OR similarity(b.name, p_query) > 0.2
    )
    AND (p_city IS NULL OR b.city ILIKE p_city)
    AND (p_category IS NULL OR b.category_slug = p_category)
  ORDER BY
    CASE WHEN b.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
    similarity(b.name, p_query) DESC,
    b.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get revenue summary for a business
CREATE OR REPLACE FUNCTION get_revenue_summary(
  p_business_id UUID,
  p_from DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_orders BIGINT,
  avg_order_value NUMERIC,
  revenue_by_day JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH daily AS (
    SELECT
      DATE_TRUNC('day', s.created_at)::DATE AS day,
      SUM(s.total) AS rev,
      COUNT(*) AS orders
    FROM sales s
    WHERE s.business_id = p_business_id
      AND s.created_at::DATE BETWEEN p_from AND p_to
      AND s.status = 'completed'
    GROUP BY 1
  )
  SELECT
    SUM(rev)::NUMERIC,
    SUM(orders)::BIGINT,
    (CASE WHEN SUM(orders) > 0 THEN SUM(rev) / SUM(orders) ELSE 0 END)::NUMERIC,
    JSON_AGG(JSON_BUILD_OBJECT('date', day, 'revenue', rev, 'orders', orders) ORDER BY day)
  FROM daily;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update business credit score (called by trigger or job)
CREATE OR REPLACE FUNCTION update_credit_score(p_business_id UUID)
RETURNS INT AS $$
DECLARE
  v_score INT := 500;
  v_on_time_pct FLOAT;
  v_months INT;
BEGIN
  -- Age bonus (up to 100 pts)
  SELECT EXTRACT(MONTH FROM AGE(NOW(), created_at))::INT INTO v_months
  FROM businesses WHERE id = p_business_id;
  v_score := v_score + LEAST(100, v_months * 2);

  -- Payment history bonus (up to 200 pts)
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 0
    ELSE (COUNT(*) FILTER (WHERE status = 'paid') * 200.0 / COUNT(*))
    END INTO v_on_time_pct
  FROM invoices WHERE business_id = p_business_id;
  v_score := v_score + v_on_time_pct::INT;

  -- Cap at 850
  v_score := LEAST(850, v_score);

  -- Upsert
  INSERT INTO business_credit_scores (business_id, score, updated_at)
  VALUES (p_business_id, v_score, NOW())
  ON CONFLICT (business_id) DO UPDATE SET score = v_score, updated_at = NOW();

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications SET read = TRUE, read_at = NOW() WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications SET read = TRUE, read_at = NOW()
  WHERE recipient_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
