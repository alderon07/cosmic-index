import type { Client } from "@libsql/client";

export type LimitHitFeature = "saved_objects" | "saved_searches" | "exports";

export interface InterestAggregate {
  savedObjectsLimitHits: number;
  savedSearchesLimitHits: number;
  exportsLimitHits: number;
}

const EMPTY_AGGREGATE: InterestAggregate = {
  savedObjectsLimitHits: 0,
  savedSearchesLimitHits: 0,
  exportsLimitHits: 0,
};

export function getUtcDayKey(timestampMs: number = Date.now()): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function getLimitHitColumn(feature: LimitHitFeature): string {
  if (feature === "saved_objects") return "saved_objects_limit_hits";
  if (feature === "saved_searches") return "saved_searches_limit_hits";
  return "exports_limit_hits";
}

async function cleanupInterestDedupArtifacts(
  db: Client,
  nowMs: number
): Promise<void> {
  const dedupCutoff = nowMs - 120 * 24 * 60 * 60 * 1000;

  await db.execute({
    sql: `
      DELETE FROM pro_interest_dedup
      WHERE id IN (
        SELECT id
        FROM pro_interest_dedup
        WHERE created_at < ?
        ORDER BY created_at ASC
        LIMIT 200
      )
    `,
    args: [dedupCutoff],
  });
}

export async function recordLimitHitWithDedup(params: {
  db: Client | null;
  userId: string;
  feature: LimitHitFeature;
  timestampMs?: number;
}): Promise<void> {
  if (!params.db) return;

  const now = params.timestampMs ?? Date.now();
  const day = getUtcDayKey(now);
  const column = getLimitHitColumn(params.feature);

  const inserted = await params.db.execute({
    sql: `
      INSERT INTO pro_interest_dedup (day, user_id, feature, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(day, user_id, feature) DO NOTHING
      RETURNING 1 AS inserted
    `,
    args: [day, params.userId, params.feature, now],
  });

  if (inserted.rows.length === 0) {
    return;
  }

  await params.db.execute({
    sql: `
      INSERT INTO pro_interest_daily (
        day,
        waitlist_signups,
        saved_objects_limit_hits,
        saved_searches_limit_hits,
        exports_limit_hits,
        updated_at
      )
      VALUES (?, 0, 0, 0, 0, ?)
      ON CONFLICT(day) DO NOTHING
    `,
    args: [day, now],
  });

  await params.db.execute({
    sql: `
      UPDATE pro_interest_daily
      SET ${column} = ${column} + 1,
          updated_at = ?
      WHERE day = ?
    `,
    args: [now, day],
  });

  await cleanupInterestDedupArtifacts(params.db, now);
}

export async function getInterestForDay(
  db: Client,
  day: string
): Promise<InterestAggregate> {
  const result = await db.execute({
    sql: `
      SELECT
        saved_objects_limit_hits,
        saved_searches_limit_hits,
        exports_limit_hits
      FROM pro_interest_daily
      WHERE day = ?
      LIMIT 1
    `,
    args: [day],
  });

  if (result.rows.length === 0) {
    return { ...EMPTY_AGGREGATE };
  }

  const row = result.rows[0];
  return {
    savedObjectsLimitHits: Number(row.saved_objects_limit_hits ?? 0),
    savedSearchesLimitHits: Number(row.saved_searches_limit_hits ?? 0),
    exportsLimitHits: Number(row.exports_limit_hits ?? 0),
  };
}

export async function getInterestForLastDays(
  db: Client,
  days: number,
  nowMs: number = Date.now()
): Promise<InterestAggregate> {
  const endDay = getUtcDayKey(nowMs);
  const startDay = getUtcDayKey(nowMs - (days - 1) * 24 * 60 * 60 * 1000);

  const result = await db.execute({
    sql: `
      SELECT
        COALESCE(SUM(saved_objects_limit_hits), 0) AS saved_objects_limit_hits,
        COALESCE(SUM(saved_searches_limit_hits), 0) AS saved_searches_limit_hits,
        COALESCE(SUM(exports_limit_hits), 0) AS exports_limit_hits
      FROM pro_interest_daily
      WHERE day >= ? AND day <= ?
    `,
    args: [startDay, endDay],
  });

  if (result.rows.length === 0) {
    return { ...EMPTY_AGGREGATE };
  }

  const row = result.rows[0];
  return {
    savedObjectsLimitHits: Number(row.saved_objects_limit_hits ?? 0),
    savedSearchesLimitHits: Number(row.saved_searches_limit_hits ?? 0),
    exportsLimitHits: Number(row.exports_limit_hits ?? 0),
  };
}
