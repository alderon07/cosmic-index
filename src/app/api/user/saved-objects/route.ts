import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { SaveObjectInputSchema, SavedObject } from "@/lib/types";
import { parseCanonicalId } from "@/lib/canonical-id";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import {
  countSavedObjects,
  countSavedObjectsSince,
  getSavedObjectByCanonicalId,
  listSavedObjects,
  saveObject,
} from "@/lib/mock-user-store";
import { getTierLimits, getUpgradePayload } from "@/lib/tier-limits";
import { resolveLimitMode, toLimitPolicyMetadata } from "@/lib/feature-policy";
import { recordLimitHitWithDedup } from "@/lib/waitlist";
import { ServerTiming } from "@/lib/server-timing";

const ROLLING_DAY_SECONDS = 24 * 60 * 60;
const ROLLING_DAY_MS = ROLLING_DAY_SECONDS * 1000;

function getSaveLimitHeaders(limit: number, used: number): Record<string, string> {
  return {
    "X-RateLimit-Saves-Limit": limit.toString(),
    "X-RateLimit-Saves-Remaining": Math.max(0, limit - used).toString(),
  };
}

/**
 * GET /api/user/saved-objects
 *
 * List all saved objects for the authenticated user.
 * Returns objects sorted by creation date (most recent first).
 */
export async function GET(request: NextRequest) {
  const timing = new ServerTiming();
  try {
    const user = await timing.measure("auth", () => requireAuth());
    const limits = getTierLimits(user.tier);
    const searchParams = request.nextUrl.searchParams;
    const page = timing.measureSync("parse_page", () =>
      Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    );
    const limit = timing.measureSync("parse_limit", () =>
      Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)))
    );
    const useMockStore = isMockUserStoreEnabled();
    const db = timing.measureSync("resolve_db", () => (useMockStore ? null : requireUserDb()));
    const limitMode = await timing.measure("limit_mode", () => resolveLimitMode({ db }));

    if (useMockStore) {
      const result = timing.measureSync("mock_list", () => listSavedObjects(user.userId, page, limit));
      const total = timing.measureSync("mock_count_total", () => countSavedObjects(user.userId));
      const sinceIso = new Date(Date.now() - ROLLING_DAY_MS).toISOString();
      const dailyUsed = timing.measureSync("mock_count_daily", () =>
        countSavedObjectsSince(user.userId, sinceIso)
      );

      return timing.json({
        objects: result.objects,
        total: result.total,
        page,
        limit,
        hasMore: result.hasMore,
        usage: {
          total: {
            current: total,
            limit: limits.MAX_SAVED_OBJECTS,
            remaining: Math.max(0, limits.MAX_SAVED_OBJECTS - total),
          },
          daily: {
            current: dailyUsed,
            limit: limits.SAVES_PER_DAY,
            remaining: Math.max(0, limits.SAVES_PER_DAY - dailyUsed),
          },
        },
        limitPolicy: toLimitPolicyMetadata(limitMode, false),
      });
    }

    const ensuredDb = timing.measureSync("ensure_db", () => db ?? requireUserDb());
    const offset = (page - 1) * limit;

    const countResult = await timing.measure("db_count_total", () =>
      ensuredDb.execute({
        sql: "SELECT COUNT(*) as total FROM saved_objects WHERE user_id = ?",
        args: [user.userId],
      })
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const dailyResult = await timing.measure("db_count_daily", () =>
      ensuredDb.execute({
        sql: `
        SELECT COUNT(*) as total
        FROM saved_objects
        WHERE user_id = ? AND created_at >= datetime('now', '-1 day')
      `,
        args: [user.userId],
      })
    );
    const dailyUsed = Number(dailyResult.rows[0]?.total ?? 0);

    const result = await timing.measure("db_list_saved", () =>
      ensuredDb.execute({
        sql: `
        SELECT id, canonical_id, display_name, notes, event_payload, created_at
        FROM saved_objects
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
        args: [user.userId, limit, offset],
      })
    );

    const objects: SavedObject[] = timing.measureSync("serialize_rows", () =>
      result.rows.map((row) => ({
        id: row.id as number,
        canonicalId: row.canonical_id as string,
        displayName: row.display_name as string,
        notes: row.notes as string | null,
        eventPayload: row.event_payload ? JSON.parse(row.event_payload as string) : null,
        createdAt: row.created_at as string,
      }))
    );

    return timing.json({
      objects,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      usage: {
        total: {
          current: total,
          limit: limits.MAX_SAVED_OBJECTS,
          remaining: Math.max(0, limits.MAX_SAVED_OBJECTS - total),
        },
        daily: {
          current: dailyUsed,
          limit: limits.SAVES_PER_DAY,
          remaining: Math.max(0, limits.SAVES_PER_DAY - dailyUsed),
        },
      },
      limitPolicy: toLimitPolicyMetadata(limitMode, false),
    });
  } catch (error) {
    const response = authErrorResponse(error);
    response.headers.set("Server-Timing", timing.toHeaderValue());
    return response;
  }
}

/**
 * POST /api/user/saved-objects
 *
 * Save a cosmic object or event.
 * Uses UNIQUE(user_id, canonical_id) to prevent duplicates - upserts on conflict.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const limits = getTierLimits(user.tier);
    const useMockStore = isMockUserStoreEnabled();
    const db = useMockStore ? null : requireUserDb();
    const limitMode = await resolveLimitMode({ db });

    const body = await request.json();
    const parseResult = SaveObjectInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { canonicalId, displayName, notes, eventPayload } = parseResult.data;

    const parsed = parseCanonicalId(canonicalId);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid canonical ID format" }, { status: 400 });
    }
    if (parsed.type === "fireball") {
      return NextResponse.json(
        { error: "unsupported_object_type", message: "Saving fireballs is not supported." },
        { status: 400 }
      );
    }

    let wouldBlock = false;

    if (useMockStore) {
      const existing = getSavedObjectByCanonicalId(user.userId, canonicalId);
      let dailyUsed = countSavedObjectsSince(
        user.userId,
        new Date(Date.now() - ROLLING_DAY_MS).toISOString()
      );

      if (!existing) {
        const total = countSavedObjects(user.userId);
        if (total >= limits.MAX_SAVED_OBJECTS) {
          wouldBlock = true;
          void recordLimitHitWithDedup({ db, userId: user.userId, feature: "saved_objects" });

          if (limitMode.effectiveMode === "enforce") {
            return NextResponse.json(
              {
                error: "saved_objects_limit_reached",
                message: `You've reached your limit of ${limits.MAX_SAVED_OBJECTS} saved objects.`,
                current: total,
                limit: limits.MAX_SAVED_OBJECTS,
                upgrade: getUpgradePayload("saved_objects"),
                limitPolicy: toLimitPolicyMetadata(limitMode, true),
              },
              { status: 403 }
            );
          }
        }

        if (dailyUsed >= limits.SAVES_PER_DAY) {
          wouldBlock = true;
          void recordLimitHitWithDedup({ db, userId: user.userId, feature: "saved_objects" });

          if (limitMode.effectiveMode === "enforce") {
            return NextResponse.json(
              {
                error: "daily_save_limit_reached",
                message: `You've reached your rolling 24-hour limit of ${limits.SAVES_PER_DAY} saves.`,
                current: dailyUsed,
                limit: limits.SAVES_PER_DAY,
                limitPolicy: toLimitPolicyMetadata(limitMode, true),
              },
              {
                status: 429,
                headers: {
                  "Retry-After": "3600",
                  ...getSaveLimitHeaders(limits.SAVES_PER_DAY, dailyUsed),
                },
              }
            );
          }
        }
      }

      const savedObject = saveObject({
        userId: user.userId,
        canonicalId,
        displayName,
        notes: notes ?? null,
        eventPayload: eventPayload ?? null,
      });

      if (!existing) {
        dailyUsed += 1;
      }

      return NextResponse.json(
        {
          ...savedObject,
          limitPolicy: toLimitPolicyMetadata(limitMode, wouldBlock),
        },
        {
          status: 201,
          headers: getSaveLimitHeaders(limits.SAVES_PER_DAY, dailyUsed),
        }
      );
    }

    const ensuredDb = db ?? requireUserDb();

    const existingResult = await ensuredDb.execute({
      sql: `
        SELECT id
        FROM saved_objects
        WHERE user_id = ? AND canonical_id = ?
        LIMIT 1
      `,
      args: [user.userId, canonicalId],
    });
    const exists = existingResult.rows.length > 0;

    const dailyResult = await ensuredDb.execute({
      sql: `
        SELECT COUNT(*) as total
        FROM saved_objects
        WHERE user_id = ? AND created_at >= datetime('now', '-1 day')
      `,
      args: [user.userId],
    });
    const dailyUsed = Number(dailyResult.rows[0]?.total ?? 0);

    if (!exists) {
      const countResult = await ensuredDb.execute({
        sql: "SELECT COUNT(*) as total FROM saved_objects WHERE user_id = ?",
        args: [user.userId],
      });
      const total = Number(countResult.rows[0]?.total ?? 0);

      if (total >= limits.MAX_SAVED_OBJECTS) {
        wouldBlock = true;
        void recordLimitHitWithDedup({ db, userId: user.userId, feature: "saved_objects" });

        if (limitMode.effectiveMode === "enforce") {
          return NextResponse.json(
            {
              error: "saved_objects_limit_reached",
              message: `You've reached your limit of ${limits.MAX_SAVED_OBJECTS} saved objects.`,
              current: total,
              limit: limits.MAX_SAVED_OBJECTS,
              upgrade: getUpgradePayload("saved_objects"),
              limitPolicy: toLimitPolicyMetadata(limitMode, true),
            },
            { status: 403 }
          );
        }
      }

      if (dailyUsed >= limits.SAVES_PER_DAY) {
        wouldBlock = true;
        void recordLimitHitWithDedup({ db, userId: user.userId, feature: "saved_objects" });

        if (limitMode.effectiveMode === "enforce") {
          const retryResult = await ensuredDb.execute({
            sql: `
              SELECT MIN(strftime('%s', created_at)) as earliest_epoch
              FROM saved_objects
              WHERE user_id = ? AND created_at >= datetime('now', '-1 day')
            `,
            args: [user.userId],
          });

          const earliestEpoch = Number(retryResult.rows[0]?.earliest_epoch ?? 0);
          const nowEpoch = Math.floor(Date.now() / 1000);
          const retryAfter = earliestEpoch > 0 ? Math.max(1, earliestEpoch + ROLLING_DAY_SECONDS - nowEpoch) : 3600;

          return NextResponse.json(
            {
              error: "daily_save_limit_reached",
              message: `You've reached your rolling 24-hour limit of ${limits.SAVES_PER_DAY} saves.`,
              current: dailyUsed,
              limit: limits.SAVES_PER_DAY,
              limitPolicy: toLimitPolicyMetadata(limitMode, true),
            },
            {
              status: 429,
              headers: {
                "Retry-After": retryAfter.toString(),
                ...getSaveLimitHeaders(limits.SAVES_PER_DAY, dailyUsed),
              },
            }
          );
        }
      }
    }

    await ensuredDb.execute({
      sql: `
        INSERT INTO saved_objects (user_id, canonical_id, display_name, notes, event_payload)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, canonical_id) DO UPDATE SET
          display_name = excluded.display_name,
          notes = COALESCE(excluded.notes, notes)
      `,
      args: [
        user.userId,
        canonicalId,
        displayName,
        notes ?? null,
        eventPayload ? JSON.stringify(eventPayload) : null,
      ],
    });

    const result = await ensuredDb.execute({
      sql: `
        SELECT id, canonical_id, display_name, notes, event_payload, created_at
        FROM saved_objects
        WHERE user_id = ? AND canonical_id = ?
      `,
      args: [user.userId, canonicalId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Failed to save object" }, { status: 500 });
    }

    const row = result.rows[0];
    const savedObject: SavedObject = {
      id: row.id as number,
      canonicalId: row.canonical_id as string,
      displayName: row.display_name as string,
      notes: row.notes as string | null,
      eventPayload: row.event_payload ? JSON.parse(row.event_payload as string) : null,
      createdAt: row.created_at as string,
    };

    const usedForHeaders = exists ? dailyUsed : dailyUsed + 1;
    return NextResponse.json(
      {
        ...savedObject,
        limitPolicy: toLimitPolicyMetadata(limitMode, wouldBlock),
      },
      {
        status: 201,
        headers: getSaveLimitHeaders(limits.SAVES_PER_DAY, usedForHeaders),
      }
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
