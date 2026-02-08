--------------------------------------------------------------------------------
-- Tier Limit Indexes
--------------------------------------------------------------------------------
-- Optimizes Turso-based rate and usage queries for free/pro feature limits.

CREATE INDEX IF NOT EXISTS idx_export_rate_limit
  ON export_history(user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_saved_daily
  ON saved_objects(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_saved_total
  ON saved_objects(user_id);

CREATE INDEX IF NOT EXISTS idx_searches_user
  ON saved_searches(user_id);
