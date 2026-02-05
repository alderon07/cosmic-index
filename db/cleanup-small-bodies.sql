-- Cleanup script: Remove small_bodies tables from Turso
-- Run with: turso db shell cosmic-index < db/cleanup-small-bodies.sql

-- Drop triggers first (they reference the tables)
DROP TRIGGER IF EXISTS sb_fts_insert;
DROP TRIGGER IF EXISTS sb_fts_delete;
DROP TRIGGER IF EXISTS sb_fts_update;

-- Drop the FTS virtual table
DROP TABLE IF EXISTS small_bodies_fts;

-- Drop all indexes (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS uq_sb_designation_nocase;
DROP INDEX IF EXISTS idx_sb_id;
DROP INDEX IF EXISTS idx_sb_body_kind;
DROP INDEX IF EXISTS idx_sb_orbit_class;
DROP INDEX IF EXISTS idx_sb_is_neo;
DROP INDEX IF EXISTS idx_sb_is_pha;
DROP INDEX IF EXISTS idx_sb_diameter;
DROP INDEX IF EXISTS idx_sb_h;
DROP INDEX IF EXISTS idx_sb_kind_class;
DROP INDEX IF EXISTS idx_sb_neo_pha;
DROP INDEX IF EXISTS idx_sb_name_sort_rowid;

-- Drop the main table
DROP TABLE IF EXISTS small_bodies;

-- Drop the small bodies ingestion state table
DROP TABLE IF EXISTS ingest_state;

-- Reclaim space
VACUUM;

-- Verify cleanup
SELECT 'Remaining tables:' as info;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
