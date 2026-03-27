-- Drop retired public waitlist table
-- Run: turso db shell cosmic-index < db/migrations/005_drop_pro_waitlist.sql

DROP INDEX IF EXISTS idx_waitlist_status_created;
DROP TABLE IF EXISTS pro_waitlist;
