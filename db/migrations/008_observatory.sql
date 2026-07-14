-- My Observatory: typed Watches, durable in-app Signals, and evaluator state.

ALTER TABLE alerts ADD COLUMN name TEXT;
ALTER TABLE alerts ADD COLUMN config_hash TEXT;
ALTER TABLE alerts ADD COLUMN enabled_at TEXT;
ALTER TABLE alerts ADD COLUMN last_matched_at TEXT;

-- Legacy configs were untyped and email was historically enabled by default.
-- Fail closed until a user re-saves a Watch through the typed builder.
UPDATE alerts
SET enabled = 0,
    email_enabled = 0,
    name = COALESCE(name, 'Legacy alert'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE config_hash IS NULL;

-- Earlier tables used SQLite's space-separated datetime format. Store all
-- Observatory ordering timestamps in one RFC 3339 shape; queries still use
-- julianday() defensively while a deployment is rolling through this change.
UPDATE alerts
SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', updated_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_user_type_config
  ON alerts(user_id, alert_type, config_hash)
  WHERE config_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_user_created
  ON alerts(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_evaluator
  ON alerts(alert_type, id)
  WHERE enabled = 1 AND config_hash IS NOT NULL;

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
  ON alert_signals(user_id, created_at DESC, id DESC)
  WHERE read_at IS NULL;

-- This ledger is intentionally user/config scoped and independent of alerts.
-- Deleting/recreating a Watch cannot cause the same upstream event to Signal again.
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
