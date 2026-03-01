import type { Client } from "@libsql/client";
import { z } from "zod";

export const WAITLIST_SOURCES = [
  "billing",
  "limit_saved_objects",
  "limit_saved_searches",
  "limit_exports",
  "pro_badge",
] as const;

export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];
export type WaitlistSignupStatus = "joined" | "already_joined" | "reactivated";
export type LimitHitFeature = "saved_objects" | "saved_searches" | "exports";

const WaitlistSourceSchema = z.enum(WAITLIST_SOURCES);

export function parseWaitlistSource(raw: unknown): WaitlistSource | null {
  const parsed = WaitlistSourceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().normalize("NFKC").toLowerCase();
}

export function getUtcDayKey(timestampMs: number = Date.now()): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function getLimitHitColumn(feature: LimitHitFeature): string {
  if (feature === "saved_objects") return "saved_objects_limit_hits";
  if (feature === "saved_searches") return "saved_searches_limit_hits";
  return "exports_limit_hits";
}

export async function getActiveWaitlistCount(db: Client): Promise<number> {
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM pro_waitlist WHERE status = 'active'",
    args: [],
  });
  return Number(result.rows[0]?.total ?? 0);
}

export async function upsertWaitlistSignup(params: {
  db: Client;
  emailRaw: string;
  source: WaitlistSource;
  userId: string | null;
  timestampMs?: number;
}): Promise<WaitlistSignupStatus> {
  const now = params.timestampMs ?? Date.now();
  const emailNormalized = normalizeEmail(params.emailRaw);

  const existing = await params.db.execute({
    sql: `
      SELECT id, status, user_id
      FROM pro_waitlist
      WHERE email_normalized = ?
         OR (user_id IS NOT NULL AND user_id = ?)
      ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END
      LIMIT 1
    `,
    args: [emailNormalized, params.userId, params.userId],
  });

  if (existing.rows.length === 0) {
    await params.db.execute({
      sql: `
        INSERT INTO pro_waitlist
          (email_normalized, email_raw, user_id, source, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `,
      args: [emailNormalized, params.emailRaw.trim(), params.userId, params.source, now, now],
    });
    return "joined";
  }

  const row = existing.rows[0];
  const status = String(row.status ?? "active");
  const existingUserId = (row.user_id as string | null | undefined) ?? null;
  const nextUserId = existingUserId ?? params.userId ?? null;

  if (status === "active") {
    await params.db.execute({
      sql: `
        UPDATE pro_waitlist
        SET email_normalized = ?, email_raw = ?, source = ?, user_id = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [emailNormalized, params.emailRaw.trim(), params.source, nextUserId, now, row.id as number],
    });
    return "already_joined";
  }

  await params.db.execute({
    sql: `
      UPDATE pro_waitlist
      SET status = 'active',
          email_normalized = ?,
          email_raw = ?,
          source = ?,
          user_id = ?,
          updated_at = ?
      WHERE id = ?
    `,
    args: [emailNormalized, params.emailRaw.trim(), params.source, nextUserId, now, row.id as number],
  });
  return "reactivated";
}

export async function incrementWaitlistSignupsDaily(
  db: Client,
  timestampMs: number = Date.now()
): Promise<void> {
  const day = getUtcDayKey(timestampMs);

  await db.execute({
    sql: `
      INSERT INTO pro_interest_daily (
        day,
        waitlist_signups,
        saved_objects_limit_hits,
        saved_searches_limit_hits,
        exports_limit_hits,
        updated_at
      )
      VALUES (?, 1, 0, 0, 0, ?)
      ON CONFLICT(day) DO UPDATE SET
        waitlist_signups = waitlist_signups + 1,
        updated_at = excluded.updated_at
    `,
    args: [day, timestampMs],
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
}

export async function unsubscribeWaitlistByUserId(
  db: Client,
  userId: string,
  timestampMs: number = Date.now()
): Promise<void> {
  await db.execute({
    sql: `
      UPDATE pro_waitlist
      SET status = 'unsubscribed',
          updated_at = ?
      WHERE user_id = ?
        AND status = 'active'
    `,
    args: [timestampMs, userId],
  });
}

export interface InterestAggregate {
  waitlistSignups: number;
  savedObjectsLimitHits: number;
  savedSearchesLimitHits: number;
  exportsLimitHits: number;
}

const EMPTY_AGGREGATE: InterestAggregate = {
  waitlistSignups: 0,
  savedObjectsLimitHits: 0,
  savedSearchesLimitHits: 0,
  exportsLimitHits: 0,
};

export async function getInterestForDay(
  db: Client,
  day: string
): Promise<InterestAggregate> {
  const result = await db.execute({
    sql: `
      SELECT
        waitlist_signups,
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
    waitlistSignups: Number(row.waitlist_signups ?? 0),
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
        COALESCE(SUM(waitlist_signups), 0) AS waitlist_signups,
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
    waitlistSignups: Number(row.waitlist_signups ?? 0),
    savedObjectsLimitHits: Number(row.saved_objects_limit_hits ?? 0),
    savedSearchesLimitHits: Number(row.saved_searches_limit_hits ?? 0),
    exportsLimitHits: Number(row.exports_limit_hits ?? 0),
  };
}

export async function cleanupWaitlistArtifacts(
  db: Client,
  nowMs: number = Date.now()
): Promise<void> {
  const waitlistCutoff = nowMs - 90 * 24 * 60 * 60 * 1000;
  const dedupCutoff = nowMs - 120 * 24 * 60 * 60 * 1000;

  await db.execute({
    sql: `
      DELETE FROM pro_waitlist
      WHERE id IN (
        SELECT id
        FROM pro_waitlist
        WHERE status IN ('unsubscribed', 'converted')
          AND updated_at < ?
        ORDER BY updated_at ASC
        LIMIT 200
      )
    `,
    args: [waitlistCutoff],
  });

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
