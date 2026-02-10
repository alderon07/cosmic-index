-- Waitlist + Interest Counters
-- Run: turso db shell cosmic-index < db/migrations/004_waitlist_interest.sql

CREATE TABLE IF NOT EXISTS pro_waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_normalized TEXT NOT NULL UNIQUE,
  email_raw TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | unsubscribed | converted
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status_created
  ON pro_waitlist(status, created_at);

CREATE TABLE IF NOT EXISTS pro_interest_daily (
  day TEXT PRIMARY KEY, -- UTC day key: YYYY-MM-DD
  waitlist_signups INTEGER NOT NULL DEFAULT 0,
  saved_objects_limit_hits INTEGER NOT NULL DEFAULT 0,
  saved_searches_limit_hits INTEGER NOT NULL DEFAULT 0,
  exports_limit_hits INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interest_updated_at
  ON pro_interest_daily(updated_at);

CREATE TABLE IF NOT EXISTS pro_interest_dedup (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL, -- UTC day key: YYYY-MM-DD
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- saved_objects | saved_searches | exports
  created_at INTEGER NOT NULL,
  UNIQUE(day, user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_interest_dedup_created
  ON pro_interest_dedup(created_at);
