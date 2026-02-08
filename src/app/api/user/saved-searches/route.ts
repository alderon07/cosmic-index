import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { CreateSavedSearchSchema, SavedSearch } from "@/lib/types";
import { canonicalizeAndHash } from "@/lib/saved-searches";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import {
  countSavedSearches,
  createSavedSearch,
  hasSavedSearchByHash,
  listSavedSearches,
} from "@/lib/mock-user-store";
import { getTierLimits, getUpgradePayload } from "@/lib/tier-limits";

/**
 * GET /api/user/saved-searches
 *
 * List all saved searches for the authenticated user.
 * Can filter by category.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const limits = getTierLimits(user.tier);

    const category = request.nextUrl.searchParams.get("category");
    const parsedCategory =
      category === "exoplanets" || category === "stars" || category === "small-bodies"
        ? category
        : undefined;

    if (isMockUserStoreEnabled()) {
      const searches = listSavedSearches(user.userId, parsedCategory);
      const total = countSavedSearches(user.userId);
      return NextResponse.json({
        searches,
        usage: {
          current: total,
          limit: limits.MAX_SAVED_SEARCHES,
          remaining: Math.max(0, limits.MAX_SAVED_SEARCHES - total),
        },
      });
    }

    const db = requireUserDb();

    let sql = `
      SELECT id, name, category, query_params, result_count, last_executed_at, created_at
      FROM saved_searches
      WHERE user_id = ?
    `;
    const args: (string | number)[] = [user.userId];

    if (parsedCategory) {
      sql += " AND category = ?";
      args.push(parsedCategory);
    }

    sql += " ORDER BY last_executed_at DESC NULLS LAST, created_at DESC";

    const [result, countResult] = await Promise.all([
      db.execute({ sql, args }),
      db.execute({
        sql: "SELECT COUNT(*) as total FROM saved_searches WHERE user_id = ?",
        args: [user.userId],
      }),
    ]);

    const searches: SavedSearch[] = result.rows.map((row) => ({
      id: row.id as number,
      name: row.name as string,
      category: row.category as "exoplanets" | "stars" | "small-bodies",
      queryParams: JSON.parse(row.query_params as string),
      resultCount: row.result_count as number | null,
      lastExecutedAt: row.last_executed_at as string | null,
      createdAt: row.created_at as string,
    }));

    const total = Number(countResult.rows[0]?.total ?? 0);

    return NextResponse.json({
      searches,
      usage: {
        current: total,
        limit: limits.MAX_SAVED_SEARCHES,
        remaining: Math.max(0, limits.MAX_SAVED_SEARCHES - total),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/user/saved-searches
 *
 * Save a search configuration.
 * Uses hash-based deduplication to prevent saving semantically identical searches.
 * If a search with the same params already exists, updates its name and last_executed_at.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const limits = getTierLimits(user.tier);

    const body = await request.json();
    const parseResult = CreateSavedSearchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, category, queryParams } = parseResult.data;
    const { canonical, hash } = canonicalizeAndHash(queryParams);

    if (isMockUserStoreEnabled()) {
      const isDuplicate = hasSavedSearchByHash(user.userId, category, hash);
      if (!isDuplicate) {
        const total = countSavedSearches(user.userId);
        if (total >= limits.MAX_SAVED_SEARCHES) {
          return NextResponse.json(
            {
              error: "saved_searches_limit_reached",
              message: `You've reached your limit of ${limits.MAX_SAVED_SEARCHES} saved searches.`,
              current: total,
              limit: limits.MAX_SAVED_SEARCHES,
              upgrade: getUpgradePayload("saved_searches"),
            },
            { status: 403 }
          );
        }
      }

      const savedSearch = createSavedSearch({
        userId: user.userId,
        name,
        category,
        queryParams,
      });
      return NextResponse.json(savedSearch, { status: 201 });
    }

    const db = requireUserDb();

    const duplicateResult = await db.execute({
      sql: `
        SELECT id
        FROM saved_searches
        WHERE user_id = ? AND category = ? AND params_hash = ?
        LIMIT 1
      `,
      args: [user.userId, category, hash],
    });

    if (duplicateResult.rows.length === 0) {
      const countResult = await db.execute({
        sql: "SELECT COUNT(*) as total FROM saved_searches WHERE user_id = ?",
        args: [user.userId],
      });
      const total = Number(countResult.rows[0]?.total ?? 0);

      if (total >= limits.MAX_SAVED_SEARCHES) {
        return NextResponse.json(
          {
            error: "saved_searches_limit_reached",
            message: `You've reached your limit of ${limits.MAX_SAVED_SEARCHES} saved searches.`,
            current: total,
            limit: limits.MAX_SAVED_SEARCHES,
            upgrade: getUpgradePayload("saved_searches"),
          },
          { status: 403 }
        );
      }
    }

    await db.execute({
      sql: `
        INSERT INTO saved_searches (user_id, name, category, query_params, params_hash, last_executed_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, category, params_hash) DO UPDATE SET
          name = excluded.name,
          last_executed_at = datetime('now')
      `,
      args: [user.userId, name, category, canonical, hash],
    });

    const result = await db.execute({
      sql: `
        SELECT id, name, category, query_params, result_count, last_executed_at, created_at
        FROM saved_searches
        WHERE user_id = ? AND category = ? AND params_hash = ?
      `,
      args: [user.userId, category, hash],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Failed to save search" }, { status: 500 });
    }

    const row = result.rows[0];
    const savedSearch: SavedSearch = {
      id: row.id as number,
      name: row.name as string,
      category: row.category as "exoplanets" | "stars" | "small-bodies",
      queryParams: JSON.parse(row.query_params as string),
      resultCount: row.result_count as number | null,
      lastExecutedAt: row.last_executed_at as string | null,
      createdAt: row.created_at as string,
    };

    return NextResponse.json(savedSearch, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
