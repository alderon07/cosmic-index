import type { Client, InStatement } from "@libsql/client";
import {
  type ObservatoryEvaluatorStore,
  type ObservatorySignalDraft,
  type ObservatoryWatchDomain,
  type ObservatoryWatchRecord,
  type SignalWriteResult,
} from "@/lib/observatory-evaluator";
import { requireUserDb } from "@/lib/user-db";

function mapWatch(row: Record<string, unknown>): ObservatoryWatchRecord {
  return {
    id: Number(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    alertType: String(row.alert_type) as ObservatoryWatchDomain,
    configHash: String(row.config_hash),
    config: JSON.parse(String(row.config)),
    enabledAt: String(row.enabled_at),
    lastMatchedAt: row.last_matched_at ? String(row.last_matched_at) : null,
  };
}

function signalArgs(watch: ObservatoryWatchRecord, signal: ObservatorySignalDraft) {
  return [
    watch.userId,
    watch.id,
    watch.name,
    signal.triggerKey,
    signal.source,
    signal.eventType,
    signal.severity,
    signal.title,
    signal.summary,
    signal.matchReason,
    signal.eventAt,
    signal.sourceAt,
    signal.destinationUrl,
    signal.sourceUrl ?? null,
    JSON.stringify(signal.snapshot),
  ];
}

async function updateExistingSignal(
  db: Client,
  watch: ObservatoryWatchRecord,
  signal: ObservatorySignalDraft,
): Promise<SignalWriteResult> {
  const result = await db.execute({
    sql: `UPDATE alert_signals
          SET watch_name = ?, event_type = ?, severity = ?, title = ?, summary = ?,
              match_reason = ?, event_at = ?, source_at = ?, destination_url = ?,
              source_url = ?, snapshot_json = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE alert_id = ? AND trigger_key = ?
            AND EXISTS (SELECT 1 FROM alerts WHERE id = ? AND enabled = 1)
            AND (watch_name IS NOT ? OR event_type IS NOT ? OR severity IS NOT ?
              OR title IS NOT ? OR summary IS NOT ? OR match_reason IS NOT ?
              OR event_at IS NOT ? OR source_at IS NOT ? OR destination_url IS NOT ?
              OR source_url IS NOT ? OR snapshot_json IS NOT ?)
          RETURNING id`,
    args: [
      watch.name,
      signal.eventType,
      signal.severity,
      signal.title,
      signal.summary,
      signal.matchReason,
      signal.eventAt,
      signal.sourceAt,
      signal.destinationUrl,
      signal.sourceUrl ?? null,
      JSON.stringify(signal.snapshot),
      watch.id,
      signal.triggerKey,
      watch.id,
      watch.name,
      signal.eventType,
      signal.severity,
      signal.title,
      signal.summary,
      signal.matchReason,
      signal.eventAt,
      signal.sourceAt,
      signal.destinationUrl,
      signal.sourceUrl ?? null,
      JSON.stringify(signal.snapshot),
    ],
  });
  return result.rows.length > 0 ? "updated" : "duplicate";
}

async function recordSignalDurably(
  db: Client,
  watch: ObservatoryWatchRecord,
  signal: ObservatorySignalDraft,
): Promise<SignalWriteResult> {
  const existing = await db.execute({
    sql: `SELECT id FROM observatory_trigger_ledger
          WHERE user_id = ? AND config_hash = ? AND source = ? AND trigger_key = ?`,
    args: [watch.userId, watch.configHash, signal.source, signal.triggerKey],
  });
  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE observatory_trigger_ledger
            SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      args: [Number(existing.rows[0]!.id)],
    });
    return updateExistingSignal(db, watch, signal);
  }

  const statements: InStatement[] = [
    {
      sql: `INSERT OR IGNORE INTO observatory_trigger_ledger
              (user_id, config_hash, source, trigger_key)
            SELECT ?, ?, ?, ?
            WHERE EXISTS (SELECT 1 FROM alerts WHERE id = ? AND user_id = ? AND enabled = 1)`,
      args: [watch.userId, watch.configHash, signal.source, signal.triggerKey, watch.id, watch.userId],
    },
    {
      sql: `INSERT INTO alert_signals
              (user_id, alert_id, watch_name, trigger_key, source, event_type, severity,
               title, summary, match_reason, event_at, source_at, destination_url,
               source_url, snapshot_json)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1`,
      args: signalArgs(watch, signal),
    },
    {
      sql: `UPDATE alerts SET last_matched_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = ? AND changes() = 1`,
      args: [watch.id],
    },
  ];
  const results = await db.batch(statements, "write");
  if (Number(results[1]?.rowsAffected ?? 0) > 0) return "inserted";

  const stillEnabled = await db.execute({
    sql: "SELECT 1 AS present FROM alerts WHERE id = ? AND user_id = ? AND enabled = 1",
    args: [watch.id, watch.userId],
  });
  return stillEnabled.rows.length > 0 ? "duplicate" : "watch_disabled";
}

export function createObservatoryEvaluatorStore(
  db: Client = requireUserDb(),
): ObservatoryEvaluatorStore {
  return {
    async countEnabledWatches(domain) {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS total FROM alerts
              WHERE alert_type = ? AND enabled = 1 AND config_hash IS NOT NULL`,
        args: [domain],
      });
      return Number(result.rows[0]?.total ?? 0);
    },

    async acquireLease({ domain, owner, ttlSeconds, continuation }) {
      const modifier = `+${ttlSeconds} seconds`;
      if (continuation) {
        const result = await db.execute({
          sql: `UPDATE observatory_evaluator_state
                SET lease_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?),
                    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                WHERE domain = ? AND run_id = ? AND lease_owner = ?
                RETURNING watermark`,
          args: [modifier, domain, owner, owner],
        });
        return {
          acquired: result.rows.length > 0,
          watermark: result.rows[0]?.watermark ? String(result.rows[0].watermark) : null,
        };
      }
      const result = await db.execute({
        sql: `INSERT INTO observatory_evaluator_state
                (domain, run_id, run_start_watermark, lease_owner, lease_expires_at)
              VALUES (?, ?, NULL, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?))
              ON CONFLICT(domain) DO UPDATE SET
                run_id = excluded.run_id,
                run_start_watermark = observatory_evaluator_state.watermark,
                lease_owner = excluded.lease_owner,
                lease_expires_at = excluded.lease_expires_at,
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE observatory_evaluator_state.lease_owner IS NULL
                 OR observatory_evaluator_state.lease_expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              RETURNING watermark`,
        args: [domain, owner, owner, modifier],
      });
      return {
        acquired: result.rows.length > 0,
        watermark: result.rows[0]?.watermark ? String(result.rows[0].watermark) : null,
      };
    },

    async listEnabledWatchesPage({ domain, afterId, limit }) {
      const result = await db.execute({
        sql: `SELECT alerts.id, alerts.user_id, alerts.name, alerts.alert_type, alerts.config,
                     alerts.config_hash, alerts.enabled_at, alerts.last_matched_at
              FROM alerts JOIN users ON users.id = alerts.user_id
              WHERE alerts.alert_type = ? AND alerts.enabled = 1
                AND alerts.config_hash IS NOT NULL AND alerts.enabled_at IS NOT NULL
                AND alerts.id > ?
                AND (
                  SELECT COUNT(*) FROM alerts AS newer
                  WHERE newer.user_id = alerts.user_id AND newer.enabled = 1
                    AND newer.config_hash IS NOT NULL
                    AND (julianday(newer.updated_at) > julianday(alerts.updated_at)
                      OR (julianday(newer.updated_at) = julianday(alerts.updated_at)
                        AND newer.id > alerts.id))
                ) < CASE WHEN users.tier = 'pro' THEN 50 ELSE 1 END
              ORDER BY alerts.id ASC LIMIT ?`,
        args: [domain, afterId ?? 0, limit + 1],
      });
      const mapped = result.rows.map((row) => mapWatch(row as Record<string, unknown>));
      return { watches: mapped.slice(0, limit), hasMore: mapped.length > limit };
    },

    recordSignalDurably: ({ watch, signal }) => recordSignalDurably(db, watch, signal),

    async recordTriggerDurably({ watch, source, triggerKey }) {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO observatory_trigger_ledger
                (user_id, config_hash, source, trigger_key)
              SELECT ?, ?, ?, ?
              WHERE EXISTS (SELECT 1 FROM alerts WHERE id = ? AND user_id = ? AND enabled = 1)
              RETURNING id`,
        args: [watch.userId, watch.configHash, source, triggerKey, watch.id, watch.userId],
      });
      if (result.rows.length > 0) return "inserted";
      const enabled = await db.execute({
        sql: "SELECT 1 AS present FROM alerts WHERE id = ? AND user_id = ? AND enabled = 1",
        args: [watch.id, watch.userId],
      });
      return enabled.rows.length > 0 ? "duplicate" : "watch_disabled";
    },

    async completeLease({ domain, owner, watermark }) {
      await db.execute({
        sql: `UPDATE observatory_evaluator_state
              SET watermark = COALESCE(?, watermark),
                  last_success_at = CASE WHEN ? IS NULL THEN last_success_at
                                         ELSE strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END,
                  last_error_at = NULL, last_error_code = NULL,
                  run_id = NULL, run_start_watermark = NULL,
                  lease_owner = NULL, lease_expires_at = NULL,
                  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE domain = ? AND lease_owner = ?`,
        args: [watermark, watermark, domain, owner],
      });
    },

    async failLease({ domain, owner, errorCode }) {
      await db.execute({
        sql: `UPDATE observatory_evaluator_state
              SET last_error_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                  last_error_code = ?, lease_owner = NULL, lease_expires_at = NULL,
                  run_id = NULL, run_start_watermark = NULL,
                  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
              WHERE domain = ? AND lease_owner = ?`,
        args: [errorCode, domain, owner],
      });
    },

    async cleanupSignals({ limit }) {
      const signalResult = await db.execute({
        sql: `DELETE FROM alert_signals WHERE id IN (
                SELECT signals.id FROM alert_signals AS signals
                JOIN users ON users.id = signals.user_id
                WHERE datetime(signals.created_at) < datetime(
                  'now', CASE WHEN users.tier = 'pro' THEN '-180 days' ELSE '-30 days' END
                )
                ORDER BY signals.id ASC LIMIT ?
              ) RETURNING id`,
        args: [limit],
      });
      const ledgerResult = await db.execute({
        sql: `DELETE FROM observatory_trigger_ledger WHERE id IN (
                SELECT id FROM observatory_trigger_ledger
                WHERE datetime(last_seen_at) < datetime('now', '-365 days')
                ORDER BY id ASC LIMIT ?
              ) RETURNING id`,
        args: [limit],
      });
      await db.execute({
        sql: `INSERT INTO observatory_evaluator_state (domain, last_cleanup_at, updated_at)
              VALUES ('cleanup', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                      strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
              ON CONFLICT(domain) DO UPDATE SET
                last_cleanup_at = excluded.last_cleanup_at,
                updated_at = excluded.updated_at`,
      });
      return {
        deleted: signalResult.rows.length + ledgerResult.rows.length,
        hasMore: signalResult.rows.length === limit || ledgerResult.rows.length === limit,
      };
    },
  };
}
