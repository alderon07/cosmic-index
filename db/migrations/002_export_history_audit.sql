--------------------------------------------------------------------------------
-- Export History Audit Extensions
--------------------------------------------------------------------------------
-- Extends export_history with full audit fields for exports.

ALTER TABLE export_history ADD COLUMN request_id TEXT;
ALTER TABLE export_history ADD COLUMN format TEXT;
ALTER TABLE export_history ADD COLUMN status TEXT;
ALTER TABLE export_history ADD COLUMN exported_count INTEGER;
ALTER TABLE export_history ADD COLUMN started_at INTEGER;
ALTER TABLE export_history ADD COLUMN completed_at INTEGER;
ALTER TABLE export_history ADD COLUMN duration_ms INTEGER;
ALTER TABLE export_history ADD COLUMN filters_hash TEXT;
ALTER TABLE export_history ADD COLUMN error_code TEXT;
ALTER TABLE export_history ADD COLUMN budget_check_skipped BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_export_user_started ON export_history(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_export_status ON export_history(status);
