-- Stars table: indexed cache of host stars from NASA Exoplanet Archive
CREATE TABLE IF NOT EXISTS stars (
  id TEXT PRIMARY KEY,              -- slug (URL-safe identifier)
  hostname TEXT NOT NULL UNIQUE,    -- upstream canonical identifier

  spectral_type TEXT,
  spectral_class TEXT,              -- derived O/B/A/F/G/K/M/Unknown

  star_temp_k REAL,
  star_mass_solar REAL,
  star_radius_solar REAL,
  star_luminosity_log REAL,
  metallicity_feh REAL,
  age_gyr REAL,

  distance_parsecs REAL,
  vmag REAL,
  kmag REAL,
  ra_deg REAL,
  dec_deg REAL,

  stars_in_system INTEGER,
  planets_in_system INTEGER,
  planet_count INTEGER NOT NULL DEFAULT 0,

  updated_at_index TEXT NOT NULL,       -- when we last ingested this row
  source_snapshot_at TEXT               -- optional: upstream data timestamp
);

-- Checkpoint table for resumable ingestion
CREATE TABLE IF NOT EXISTS ingestion_state (
  id TEXT PRIMARY KEY DEFAULT 'stars',
  last_hostname TEXT,
  last_run_at TEXT,
  rows_ingested INTEGER DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stars_hostname ON stars(hostname);
CREATE INDEX IF NOT EXISTS idx_stars_spectral_class ON stars(spectral_class);
CREATE INDEX IF NOT EXISTS idx_stars_planet_count ON stars(planet_count);
CREATE INDEX IF NOT EXISTS idx_stars_distance ON stars(distance_parsecs);
CREATE INDEX IF NOT EXISTS idx_stars_vmag ON stars(vmag);

-- Exoplanets table: indexed cache of exoplanets from NASA Exoplanet Archive
CREATE TABLE IF NOT EXISTS exoplanets (
  id TEXT PRIMARY KEY,                -- URL-safe slug
  pl_name TEXT NOT NULL UNIQUE,       -- canonical identifier
  pl_name_lower TEXT NOT NULL,        -- lowercased for stable keyset pagination

  hostname TEXT NOT NULL,             -- host star name
  discovery_method TEXT,
  disc_facility TEXT,                 -- matches NASA column name exactly
  disc_year INTEGER,

  orbital_period_days REAL,
  radius_earth REAL,
  mass_earth REAL,
  equilibrium_temp_k REAL,

  distance_parsecs REAL,
  stars_in_system INTEGER,
  planets_in_system INTEGER,

  st_spectype TEXT,
  st_teff REAL,
  st_mass REAL,
  st_rad REAL,
  st_lum REAL,

  ra_deg REAL,
  dec_deg REAL,

  updated_at_index TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exoplanets_hostname ON exoplanets(hostname);
CREATE INDEX IF NOT EXISTS idx_exoplanets_pl_name ON exoplanets(pl_name);
CREATE INDEX IF NOT EXISTS idx_exoplanets_pl_name_lower ON exoplanets(pl_name_lower);
CREATE INDEX IF NOT EXISTS idx_exoplanets_discovery_method ON exoplanets(discovery_method);
CREATE INDEX IF NOT EXISTS idx_exoplanets_disc_year ON exoplanets(disc_year);
CREATE INDEX IF NOT EXISTS idx_exoplanets_distance ON exoplanets(distance_parsecs);
CREATE INDEX IF NOT EXISTS idx_exoplanets_radius ON exoplanets(radius_earth);

-- Composite index for common filter+sort pattern
CREATE INDEX IF NOT EXISTS idx_exoplanets_method_year ON exoplanets(discovery_method, disc_year DESC);

-- FTS5 virtual table for fast full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS exoplanets_fts USING fts5(
  pl_name,
  hostname,
  discovery_method,
  content='exoplanets',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync with main table
CREATE TRIGGER IF NOT EXISTS exoplanets_fts_insert AFTER INSERT ON exoplanets BEGIN
  INSERT INTO exoplanets_fts(rowid, pl_name, hostname, discovery_method)
  VALUES (NEW.rowid, NEW.pl_name, NEW.hostname, NEW.discovery_method);
END;

CREATE TRIGGER IF NOT EXISTS exoplanets_fts_delete AFTER DELETE ON exoplanets BEGIN
  INSERT INTO exoplanets_fts(exoplanets_fts, rowid, pl_name, hostname, discovery_method)
  VALUES ('delete', OLD.rowid, OLD.pl_name, OLD.hostname, OLD.discovery_method);
END;

CREATE TRIGGER IF NOT EXISTS exoplanets_fts_update AFTER UPDATE ON exoplanets BEGIN
  INSERT INTO exoplanets_fts(exoplanets_fts, rowid, pl_name, hostname, discovery_method)
  VALUES ('delete', OLD.rowid, OLD.pl_name, OLD.hostname, OLD.discovery_method);
  INSERT INTO exoplanets_fts(rowid, pl_name, hostname, discovery_method)
  VALUES (NEW.rowid, NEW.pl_name, NEW.hostname, NEW.discovery_method);
END;

-- Stripe subscription ledger for robust billing reconciliation
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT 0,
  current_period_start TEXT,
  current_period_end TEXT,
  ended_at TEXT,
  metadata_json TEXT,
  last_webhook_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user
  ON stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer
  ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_price_status
  ON stripe_subscriptions(user_id, stripe_price_id, status);

-- My Observatory (the deployed database reaches this state through migration 008)
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  alert_type TEXT NOT NULL,
  config TEXT NOT NULL,
  config_hash TEXT,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  email_enabled BOOLEAN NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  enabled_at TEXT,
  last_matched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_user_type_config
  ON alerts(user_id, alert_type, config_hash) WHERE config_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_user_created
  ON alerts(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_evaluator
  ON alerts(alert_type, id) WHERE enabled = 1 AND config_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS alert_signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id INTEGER REFERENCES alerts(id) ON DELETE SET NULL,
  watch_name TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  match_reason TEXT NOT NULL,
  event_at TEXT,
  source_at TEXT,
  destination_url TEXT NOT NULL,
  source_url TEXT,
  snapshot_json TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_alert_signals_user_cursor
  ON alert_signals(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_alert_signals_alert
  ON alert_signals(alert_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_signals_user_unread
  ON alert_signals(user_id, created_at DESC, id DESC) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS observatory_trigger_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  config_hash TEXT NOT NULL,
  source TEXT NOT NULL,
  trigger_key TEXT NOT NULL,
  first_triggered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id, config_hash, source, trigger_key)
);
CREATE INDEX IF NOT EXISTS idx_observatory_ledger_expiry
  ON observatory_trigger_ledger(last_seen_at);

CREATE TABLE IF NOT EXISTS observatory_evaluator_state (
  domain TEXT PRIMARY KEY,
  watermark TEXT,
  run_id TEXT,
  run_start_watermark TEXT,
  lease_owner TEXT,
  lease_expires_at TEXT,
  last_success_at TEXT,
  last_error_at TEXT,
  last_error_code TEXT,
  last_cleanup_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
