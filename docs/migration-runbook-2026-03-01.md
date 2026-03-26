# Migration Runbook (Executed 2026-03-01)

Last updated (UTC): 2026-03-26

## Status

- Migration window executed on **March 1, 2026**.
- Core Pro + rollout migrations are applied in this environment:
  1. `db/migrations/001_pro_features.sql`
  2. `db/migrations/002_export_history_audit.sql`
  3. `db/migrations/003_tier_limit_indexes.sql`
  4. `db/migrations/004_waitlist_interest.sql`
- There are no pending migrations in this sequence.
- For the current production deployment track, migrations are already complete and should be treated as done unless the app is pointed at a different database.
- No additional migration is required to retire the waitlist from the active rollout path; legacy waitlist tables can stay in place until a later cleanup migration.

## Execution Record

| Migration | Outcome | Notes |
|----------|---------|-------|
| `001_pro_features.sql` | Applied | Base Pro tables/indexes (`users`, `saved_objects`, `saved_searches`, `stripe_events`, etc.) |
| `002_export_history_audit.sql` | Applied | Extended `export_history` audit columns + indexes |
| `003_tier_limit_indexes.sql` | Applied | Tier/rate-limit support indexes |
| `004_waitlist_interest.sql` | Applied | Waitlist + interest tracking tables |

## Verification Commands

Use these read-only checks when validating another environment:

```bash
turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
turso db shell cosmic-index "PRAGMA table_info(export_history);"
turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;"
```

Recommended focused check for key indexes:

```bash
turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_export_user_started','idx_export_status','idx_export_rate_limit','idx_saved_daily','idx_saved_total','idx_searches_user','idx_users_stripe_customer') ORDER BY name;"
```

## Idempotent Re-Run Guidance

- `001`, `003`, and `004` are safe to re-run because they use `IF NOT EXISTS` patterns.
- `002` contains `ALTER TABLE ... ADD COLUMN` statements and is not fully idempotent.
- If re-running `002`, compare `PRAGMA table_info(export_history)` first and execute only missing `ADD COLUMN` statements.

## Rollback and Recovery Notes

- This migration set does not provide down-migrations.
- If rollback is required, restore from backup/snapshot and redeploy app code aligned to that schema.
- For partial failures, complete the remaining statements after resolving the specific failing step; do not restart from scratch blindly.

## Next Time Checklist

For future schema waves:

1. Run migration commands in a low-traffic window.
2. Capture command output in deployment notes.
3. Run verification queries immediately after apply.
4. Update `APP-TODO.md`, `AGENTS.md`, and relevant docs with completion status.
