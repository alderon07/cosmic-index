-- Pro Tier Features Migration
-- Run: turso db shell cosmic-index < db/migrations/001_pro_features.sql

--------------------------------------------------------------------------------
-- Users (synced from Clerk)
--------------------------------------------------------------------------------
-- Source of truth for subscription tier. Clerk JWT claims are convenience only.
-- Stripe webhooks update this table directly.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                -- Clerk user ID (user_xxx)
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  stripe_customer_id TEXT,            -- Stripe customer ID (cus_xxx)
  stripe_subscription_id TEXT,        -- Stripe subscription ID (sub_xxx)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for Stripe webhook lookups (find user by customer ID)
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

--------------------------------------------------------------------------------
-- Saved Objects
--------------------------------------------------------------------------------
-- Stores references to cosmic objects a user has saved.
-- canonical_id format: "{type}:{slug}" for catalog objects (exoplanet, star, small-body)
-- or "{type}:{hash}" for event streams (fireball, close-approach, flr, cme, gst)
CREATE TABLE IF NOT EXISTS saved_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_id TEXT NOT NULL,         -- e.g., 'exoplanet:kepler-442-b' or 'fireball:a1b2c3...'
  display_name TEXT NOT NULL,         -- Human-readable name for display
  notes TEXT,                         -- User's personal notes
  -- For event-stream saves: store payload so we can display without refetching
  -- Catalog objects (exoplanet/star/small-body) leave this NULL
  event_payload TEXT,                 -- JSON: { date, lat, lon, energy, ... }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, canonical_id)       -- CRITICAL: prevents duplicate saves
);

-- Index for listing user's saved objects (most recent first)
CREATE INDEX IF NOT EXISTS idx_saved_objects_user_created ON saved_objects(user_id, created_at DESC);

--------------------------------------------------------------------------------
-- Collections
--------------------------------------------------------------------------------
-- User-created collections to organize saved objects.
-- Names must be unique per user.
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f97316',       -- Default: reactor orange
  icon TEXT DEFAULT 'folder',         -- Icon name from lucide-react
  is_public BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)               -- No duplicate collection names per user
);

CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);

--------------------------------------------------------------------------------
-- Collection Items
--------------------------------------------------------------------------------
-- Junction table linking saved objects to collections.
-- Supports manual ordering via position field.
CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  saved_object_id INTEGER NOT NULL REFERENCES saved_objects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,  -- For manual ordering within collection
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(collection_id, saved_object_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_items_position ON collection_items(collection_id, position);

--------------------------------------------------------------------------------
-- Saved Searches
--------------------------------------------------------------------------------
-- Stores user's saved search configurations.
-- Uses canonicalized params hash to prevent semantically identical duplicates.
CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,             -- 'exoplanets' | 'stars' | 'small-bodies'
  query_params TEXT NOT NULL,         -- Canonicalized JSON (sorted keys, no defaults)
  params_hash TEXT NOT NULL,          -- SHA256 of canonicalized params (32 hex chars)
  result_count INTEGER,               -- Cached count from last execution
  last_executed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, category, params_hash)  -- Prevents semantically identical searches
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);

--------------------------------------------------------------------------------
-- Alerts
--------------------------------------------------------------------------------
-- User-configured alerts for cosmic events.
-- Supported types: space_weather, fireball, close_approach
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,           -- 'space_weather' | 'fireball' | 'close_approach'
  config TEXT NOT NULL,               -- JSON config specific to alert type
  enabled BOOLEAN NOT NULL DEFAULT 1,
  email_enabled BOOLEAN NOT NULL DEFAULT 1,
  last_checked_at TEXT,               -- For incremental event checking (write optimization)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for cron job: find all enabled alerts by type
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(enabled, alert_type);

--------------------------------------------------------------------------------
-- Alert Triggers
--------------------------------------------------------------------------------
-- Deduplication table to prevent sending duplicate notifications.
-- trigger_key uses the same canonical ID scheme as saved objects for consistency.
CREATE TABLE IF NOT EXISTS alert_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL,          -- e.g., 'flr:a1b2c3...' or 'fireball:x9y8z7...'
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(alert_id, trigger_key)       -- CRITICAL: prevents duplicate notifications
);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert ON alert_triggers(alert_id);

--------------------------------------------------------------------------------
-- Stripe Events (Idempotency)
--------------------------------------------------------------------------------
-- Stores processed Stripe event IDs to ensure idempotent webhook handling.
-- Insert-as-lock pattern: INSERT first, process only if successful.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,                -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

--------------------------------------------------------------------------------
-- Export History
--------------------------------------------------------------------------------
-- Minimal audit log for exports. Avoids write bloat by only logging count.
CREATE TABLE IF NOT EXISTS export_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,             -- What was exported
  record_count INTEGER NOT NULL,      -- How many records
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- No index needed - rarely queried, just for auditing
