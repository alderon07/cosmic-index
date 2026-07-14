import type { Client, InStatement } from "@libsql/client";
import { z } from "zod";
import type { UserTier } from "@/lib/auth";
import {
  canonicalizeWatchConfig,
  CloseApproachWatchConfigSchema,
  SpaceWeatherWatchConfigSchema,
  WatchUpdateSchema,
  type WatchInput,
} from "@/lib/observatory";
import { getTierLimits } from "@/lib/tier-limits";
import { requireUserDb } from "@/lib/user-db";
import {
  InternalDestinationSchema,
  ObservatorySourceUrlSchema,
} from "@/lib/observatory-url";

const CursorSchema = z.object({ createdAt: z.string(), id: z.number().int().positive() }).strict();

export type WatchRecord = WatchInput & {
  id: number;
  configHash: string;
  enabled: boolean;
  enabledAt: string | null;
  lastMatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface Usage {
  current: number;
  limit: number;
  remaining: number;
}

export interface SignalRecord {
  id: number;
  alertId: number | null;
  watchName: string;
  triggerKey: string;
  source: string;
  eventType: string;
  severity: string | null;
  title: string;
  summary: string;
  matchReason: string;
  eventAt: string | null;
  sourceAt: string | null;
  destinationUrl: string;
  sourceUrl: string | null;
  snapshot: unknown;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function encodeCursor(createdAt: string, id: number): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString("base64url");
}

export function decodeObservatoryCursor(value: string): { createdAt: string; id: number } | null {
  try {
    return CursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

function mapWatch(row: Record<string, unknown>): WatchRecord {
  const alertType = row.alert_type === "space_weather" ? "space_weather" : "close_approach";
  const rawConfig = JSON.parse(String(row.config));
  const config = alertType === "space_weather"
    ? SpaceWeatherWatchConfigSchema.parse(rawConfig)
    : CloseApproachWatchConfigSchema.parse(rawConfig);
  return {
    id: Number(row.id),
    name: String(row.name),
    alertType,
    config,
    configHash: String(row.config_hash),
    enabled: Boolean(row.enabled),
    enabledAt: row.enabled_at ? String(row.enabled_at) : null,
    lastMatchedAt: row.last_matched_at ? String(row.last_matched_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  } as WatchRecord;
}

function usage(current: number, tier: UserTier): Usage {
  const limit = getTierLimits(tier).MAX_WATCHES;
  return { current, limit, remaining: Math.max(0, limit - current) };
}

export async function listWatches(input: {
  userId: string; tier: UserTier; cursor?: { createdAt: string; id: number }; limit: number;
  db?: Client;
}) {
  const db = input.db ?? requireUserDb();
  const args: Array<string | number> = [input.userId];
  const cursorSql = input.cursor
    ? "AND (created_at < ? OR (created_at = ? AND id < ?))"
    : "";
  if (input.cursor) args.push(input.cursor.createdAt, input.cursor.createdAt, input.cursor.id);
  args.push(input.limit + 1);
  const [rowsResult, countResult] = await Promise.all([
    db.execute({
      sql: `SELECT id, name, alert_type, config, config_hash, enabled, enabled_at,
                   last_matched_at, created_at, updated_at
            FROM alerts WHERE user_id = ? AND config_hash IS NOT NULL ${cursorSql}
            ORDER BY created_at DESC, id DESC LIMIT ?`,
      args,
    }),
    db.execute({ sql: "SELECT COUNT(*) AS total FROM alerts WHERE user_id = ? AND config_hash IS NOT NULL", args: [input.userId] }),
  ]);
  const mapped = rowsResult.rows.map((row) => mapWatch(row as Record<string, unknown>));
  const hasMore = mapped.length > input.limit;
  const watches = hasMore ? mapped.slice(0, input.limit) : mapped;
  const last = watches.at(-1);
  const total = Number(countResult.rows[0]?.total ?? 0);
  return {
    watches,
    total,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
    usage: usage(total, input.tier),
  };
}

export type CreateWatchResult =
  | { status: "created"; watch: WatchRecord; usage: Usage }
  | { status: "limit"; usage: Usage }
  | { status: "duplicate" };

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && /constraint|unique/i.test(error.message);
}

export async function createWatch(input: {
  userId: string; tier: UserTier; watch: WatchInput; db?: Client;
}): Promise<CreateWatchResult> {
  const db = input.db ?? requireUserDb();
  const { canonical, hash } = canonicalizeWatchConfig(input.watch.config);
  const limit = getTierLimits(input.tier).MAX_WATCHES;
  try {
    const result = await db.execute({
      sql: `INSERT INTO alerts
              (user_id, name, alert_type, config, config_hash, enabled, email_enabled,
               enabled_at, created_at, updated_at)
            SELECT ?, ?, ?, ?, ?, 1, 0,
                   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                   strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                   strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE (SELECT COUNT(*) FROM alerts WHERE user_id = ? AND config_hash IS NOT NULL) < ?
            RETURNING id, name, alert_type, config, config_hash, enabled, enabled_at,
                      last_matched_at, created_at, updated_at`,
      args: [input.userId, input.watch.name, input.watch.alertType, canonical, hash, input.userId, limit],
    });
    if (result.rows.length === 0) {
      const count = await db.execute({ sql: "SELECT COUNT(*) AS total FROM alerts WHERE user_id = ? AND config_hash IS NOT NULL", args: [input.userId] });
      return { status: "limit", usage: usage(Number(count.rows[0]?.total ?? limit), input.tier) };
    }
    const count = await db.execute({ sql: "SELECT COUNT(*) AS total FROM alerts WHERE user_id = ? AND config_hash IS NOT NULL", args: [input.userId] });
    return { status: "created", watch: mapWatch(result.rows[0] as Record<string, unknown>), usage: usage(Number(count.rows[0]?.total ?? 1), input.tier) };
  } catch (error) {
    if (isConstraintError(error)) return { status: "duplicate" };
    throw error;
  }
}

export async function getWatch(userId: string, id: number, db = requireUserDb()): Promise<WatchRecord | null> {
  const result = await db.execute({
    sql: `SELECT id, name, alert_type, config, config_hash, enabled, enabled_at,
                 last_matched_at, created_at, updated_at
          FROM alerts WHERE id = ? AND user_id = ? AND config_hash IS NOT NULL`,
    args: [id, userId],
  });
  return result.rows[0] ? mapWatch(result.rows[0] as Record<string, unknown>) : null;
}

export type UpdateWatchResult = { status: "updated"; watch: WatchRecord } | { status: "not_found" | "conflict" | "duplicate" | "type_mismatch" | "limit" };

export async function updateWatch(input: {
  userId: string; tier: UserTier; id: number; update: z.infer<typeof WatchUpdateSchema>; db?: Client;
}): Promise<UpdateWatchResult> {
  const db = input.db ?? requireUserDb();
  const current = await getWatch(input.userId, input.id, db);
  if (!current) return { status: "not_found" };
  if (current.updatedAt !== input.update.expectedUpdatedAt) return { status: "conflict" };
  if (input.update.enabled === true && !current.enabled) {
    const count = await db.execute({
      sql: "SELECT COUNT(*) AS total FROM alerts WHERE user_id = ? AND config_hash IS NOT NULL",
      args: [input.userId],
    });
    if (Number(count.rows[0]?.total ?? 0) > getTierLimits(input.tier).MAX_WATCHES) {
      return { status: "limit" };
    }
  }

  const config = input.update.config ?? current.config;
  const parsedConfig = current.alertType === "space_weather"
    ? SpaceWeatherWatchConfigSchema.safeParse(config)
    : CloseApproachWatchConfigSchema.safeParse(config);
  if (!parsedConfig.success) return { status: "type_mismatch" };
  const { canonical, hash } = canonicalizeWatchConfig(parsedConfig.data);
  const configChanged = hash !== current.configHash;
  const nextEnabled = input.update.enabled ?? current.enabled;
  try {
    const statements: InStatement[] = [{
      sql: `UPDATE alerts SET name = ?, config = ?, config_hash = ?, enabled = ?,
                   enabled_at = CASE
                     WHEN ? = 1 AND ? = 1 THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                     WHEN ? = 1 THEN NULL
                     WHEN enabled = 0 AND ? = 1 THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                     ELSE enabled_at
                   END,
                   last_matched_at = CASE WHEN ? = 1 THEN NULL ELSE last_matched_at END,
                   email_enabled = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE id = ? AND user_id = ? AND updated_at = ?
            RETURNING id, name, alert_type, config, config_hash, enabled, enabled_at,
                      last_matched_at, created_at, updated_at`,
      args: [
        input.update.name ?? current.name,
        canonical,
        hash,
        nextEnabled ? 1 : 0,
        configChanged ? 1 : 0,
        nextEnabled ? 1 : 0,
        configChanged ? 1 : 0,
        nextEnabled ? 1 : 0,
        configChanged ? 1 : 0,
        input.id,
        input.userId,
        input.update.expectedUpdatedAt,
      ],
    }];
    if (configChanged) {
      // Copy, rather than move, durable history: restoring the old config later
      // must remain just as quiet as the edited config.
      statements.push({
        sql: `INSERT OR IGNORE INTO observatory_trigger_ledger
                (user_id, config_hash, source, trigger_key, first_triggered_at, last_seen_at)
              SELECT user_id, ?, source, trigger_key, first_triggered_at, last_seen_at
              FROM observatory_trigger_ledger
              WHERE user_id = ? AND config_hash = ? AND changes() = 1`,
        args: [hash, input.userId, current.configHash],
      });
    }
    const results = await db.batch(statements, "write");
    return results[0]?.rows[0]
      ? { status: "updated", watch: mapWatch(results[0].rows[0] as Record<string, unknown>) }
      : { status: "conflict" };
  } catch (error) {
    if (isConstraintError(error)) return { status: "duplicate" };
    throw error;
  }
}

/**
 * Reconcile a downgrade without deleting user data. Free keeps the most recently
 * user-updated Watch enabled; all others are paused. Pro never auto-resumes.
 */
export async function reconcileWatchAllowance(
  userId: string,
  tier: UserTier,
  db = requireUserDb(),
): Promise<number> {
  if (tier === "pro") return 0;
  const result = await db.execute({
    sql: `WITH newest_enabled AS (
            SELECT id FROM alerts
            WHERE user_id = ? AND config_hash IS NOT NULL AND enabled = 1
            ORDER BY julianday(updated_at) DESC, id DESC LIMIT 1
          )
          UPDATE alerts
          SET enabled = 0,
              email_enabled = 0
          WHERE user_id = ? AND config_hash IS NOT NULL
            AND enabled = 1
            AND id <> COALESCE((SELECT id FROM newest_enabled), -1)
          RETURNING id`,
    args: [userId, userId],
  });
  return result.rows.length;
}

export async function deleteWatch(userId: string, id: number, db = requireUserDb()): Promise<boolean> {
  const result = await db.execute({ sql: "DELETE FROM alerts WHERE id = ? AND user_id = ? AND config_hash IS NOT NULL RETURNING id", args: [id, userId] });
  return result.rows.length > 0;
}

function mapSignal(row: Record<string, unknown>): SignalRecord {
  const destination = InternalDestinationSchema.safeParse(row.destination_url);
  const sourceUrl = row.source_url
    ? ObservatorySourceUrlSchema.safeParse(row.source_url)
    : null;
  return {
    id: Number(row.id), alertId: row.alert_id === null ? null : Number(row.alert_id),
    watchName: String(row.watch_name), triggerKey: String(row.trigger_key), source: String(row.source),
    eventType: String(row.event_type), severity: row.severity ? String(row.severity) : null,
    title: String(row.title), summary: String(row.summary), matchReason: String(row.match_reason),
    eventAt: row.event_at ? String(row.event_at) : null, sourceAt: row.source_at ? String(row.source_at) : null,
    destinationUrl: destination.success ? destination.data : "/user/observatory/signals",
    sourceUrl: sourceUrl?.success ? sourceUrl.data : null,
    snapshot: row.snapshot_json ? JSON.parse(String(row.snapshot_json)) : null,
    readAt: row.read_at ? String(row.read_at) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function listSignals(input: {
  userId: string; cursor?: { createdAt: string; id: number }; limit: number;
  status?: "all" | "read" | "unread"; alertId?: number; eventType?: string; db?: Client;
}) {
  const db = input.db ?? requireUserDb();
  const clauses = ["user_id = ?"];
  const args: Array<string | number> = [input.userId];
  if (input.status === "read") clauses.push("read_at IS NOT NULL");
  if (input.status === "unread") clauses.push("read_at IS NULL");
  if (input.alertId !== undefined) { clauses.push("alert_id = ?"); args.push(input.alertId); }
  if (input.eventType) { clauses.push("event_type = ?"); args.push(input.eventType); }
  if (input.cursor) {
    clauses.push("(created_at < ? OR (created_at = ? AND id < ?))");
    args.push(input.cursor.createdAt, input.cursor.createdAt, input.cursor.id);
  }
  args.push(input.limit + 1);
  const result = await db.execute({
    sql: `SELECT * FROM alert_signals WHERE ${clauses.join(" AND ")}
          ORDER BY created_at DESC, id DESC LIMIT ?`, args,
  });
  const mapped = result.rows.map((row) => mapSignal(row as Record<string, unknown>));
  const hasMore = mapped.length > input.limit;
  const signals = hasMore ? mapped.slice(0, input.limit) : mapped;
  const last = signals.at(-1);
  return { signals, hasMore, nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null };
}

export async function countUnreadSignals(userId: string, db = requireUserDb()): Promise<number> {
  const result = await db.execute({ sql: "SELECT COUNT(*) AS total FROM alert_signals WHERE user_id = ? AND read_at IS NULL", args: [userId] });
  return Number(result.rows[0]?.total ?? 0);
}

export async function setSignalReadState(userId: string, id: number, read: boolean, db = requireUserDb()): Promise<boolean> {
  const result = await db.execute({
    sql: `UPDATE alert_signals SET read_at = ${read ? "COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))" : "NULL"},
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ? AND user_id = ? RETURNING id`,
    args: [id, userId],
  });
  return result.rows.length > 0;
}

export async function markAllSignalsRead(userId: string, db = requireUserDb()): Promise<number> {
  const result = await db.execute({
    sql: `UPDATE alert_signals SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE user_id = ? AND read_at IS NULL`, args: [userId],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function executeAtomicBatch(db: Client, statements: InStatement[]) {
  return db.batch(statements, "write");
}
