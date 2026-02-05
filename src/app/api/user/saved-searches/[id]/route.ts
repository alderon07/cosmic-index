import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { SavedSearch } from "@/lib/types";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateSavedSearchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  resultCount: z.number().int().min(0).optional(),
});

/**
 * GET /api/user/saved-searches/[id]
 *
 * Get a single saved search by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const searchId = parseInt(id, 10);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `
        SELECT id, name, category, query_params, result_count, last_executed_at, created_at
        FROM saved_searches
        WHERE id = ? AND user_id = ?
      `,
      args: [searchId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    return NextResponse.json(savedSearch);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/user/saved-searches/[id]
 *
 * Update a saved search's name or result count.
 * Also updates last_executed_at to now.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const searchId = parseInt(id, 10);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = UpdateSavedSearchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    // Build dynamic UPDATE query
    const setClauses: string[] = ['last_executed_at = datetime("now")'];
    const args: (string | number)[] = [];

    if (updates.name !== undefined) {
      setClauses.push("name = ?");
      args.push(updates.name);
    }
    if (updates.resultCount !== undefined) {
      setClauses.push("result_count = ?");
      args.push(updates.resultCount);
    }

    args.push(searchId, user.userId);

    const result = await db.execute({
      sql: `
        UPDATE saved_searches
        SET ${setClauses.join(", ")}
        WHERE id = ? AND user_id = ?
        RETURNING id, name, category, query_params, result_count, last_executed_at, created_at
      `,
      args,
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    return NextResponse.json(savedSearch);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/user/saved-searches/[id]
 *
 * Delete a saved search.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const searchId = parseInt(id, 10);
    if (isNaN(searchId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "DELETE FROM saved_searches WHERE id = ? AND user_id = ? RETURNING id",
      args: [searchId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
