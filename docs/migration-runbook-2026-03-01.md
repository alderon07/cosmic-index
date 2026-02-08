# Deferred Migration Runbook (Turso Reset Window)

## Status

- `Current date`: February 8, 2026
- `Constraint`: Turso write quota exhausted
- `Action`: Do **not** run migrations before reset
- `Earliest execution date`: March 1, 2026 (after quota reset)

## Scope

This runbook covers these migration files:

1. `db/migrations/001_pro_features.sql`
2. `db/migrations/002_export_history_audit.sql`
3. `db/migrations/003_tier_limit_indexes.sql`

## Why this runbook exists

- `001` is mostly idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- `002` is **not** idempotent because `ALTER TABLE ... ADD COLUMN` fails if a column already exists.
- `003` is idempotent (`CREATE INDEX IF NOT EXISTS`).

Because current DB state may be partially migrated, run schema checks first and apply only missing changes.

## Pre-Reset Guardrails (Before March 1, 2026)

- Do not execute migration SQL before quota reset.
- Keep migration-dependent paths behind existing auth/feature controls in production.
- Treat these endpoints as migration-dependent:
  - `/api/user/export` (depends on extended `export_history` audit columns and indexes)
  - `/api/user/saved-objects` (depends on tier-aware usage/index assumptions)
  - `/api/user/saved-searches` (depends on tier-aware usage/index assumptions)

## Preflight (Read-only checks)

Run these checks first:

```bash
turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

```bash
turso db shell cosmic-index "PRAGMA table_info(export_history);"
```

```bash
turso db shell cosmic-index "PRAGMA table_info(saved_objects);"
```

```bash
turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;"
```

## Execution Order (March 1+)

### 1) Apply `001` only if base tables are missing

If `users`, `saved_objects`, `saved_searches`, or `export_history` are missing:

```bash
turso db shell cosmic-index < db/migrations/001_pro_features.sql
```

If those tables already exist, skip `001`.

### 2) Apply `002` column additions safely

Check `PRAGMA table_info(export_history)` output.
Only run `ADD COLUMN` statements for columns that are missing.

Commands from `002`:

```sql
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
```

Then run indexes from `002` (safe to re-run):

```bash
turso db shell cosmic-index "CREATE INDEX IF NOT EXISTS idx_export_user_started ON export_history(user_id, started_at);"
turso db shell cosmic-index "CREATE INDEX IF NOT EXISTS idx_export_status ON export_history(status);"
```

### 3) Apply `003` indexes

```bash
turso db shell cosmic-index < db/migrations/003_tier_limit_indexes.sql
```

## Post-Apply Verification

Verify expected columns:

```bash
turso db shell cosmic-index "PRAGMA table_info(export_history);"
```

Expected audit columns:

- `request_id`
- `format`
- `status`
- `exported_count`
- `started_at`
- `completed_at`
- `duration_ms`
- `filters_hash`
- `error_code`
- `budget_check_skipped`

Verify expected indexes:

```bash
turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_export_user_started','idx_export_status','idx_export_rate_limit','idx_saved_daily','idx_saved_total','idx_searches_user') ORDER BY name;"
```

## Rollout Notes

- Run during low-traffic window on March 1, 2026.
- Keep all migration commands and output in deployment notes.
- If any `ALTER TABLE` fails due to duplicate column, skip that statement and continue.
- After successful verification, mark DB migration tasks complete in `docs/pro-tier-todos.md`.
