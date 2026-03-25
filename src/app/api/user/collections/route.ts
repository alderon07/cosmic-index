import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { getFeatureDisabledResponse, resolveProAccess } from "@/lib/pro-access";
import { requireUserDb } from "@/lib/user-db";
import { CreateCollectionSchema, Collection } from "@/lib/types";
import { ServerTiming } from "@/lib/server-timing";
import {
  decodeCollectionsCursor,
  encodeCollectionsCursor,
  parsePaginationLimit,
} from "@/lib/user-pagination";

/**
 * GET /api/user/collections
 *
 * List all collections for the authenticated user.
 * Includes item count for each collection.
 */
export async function GET(request: NextRequest) {
  const timing = new ServerTiming();
  try {
    const user = await timing.measure("auth", () => requireAuth());
    if (!resolveProAccess(user).canAccessCollections) {
      return timing.json({ error: "feature_disabled", feature: "collections" }, { status: 403 });
    }
    const searchParams = request.nextUrl.searchParams;
    const limit = timing.measureSync("parse_limit", () =>
      parsePaginationLimit(searchParams.get("limit"), 24, 100)
    );
    const rawCursor = searchParams.get("cursor");
    const cursor = timing.measureSync("parse_cursor", () =>
      rawCursor ? decodeCollectionsCursor(rawCursor) : null
    );

    if (rawCursor && !cursor) {
      return timing.json(
        { error: "invalid_cursor", message: "Invalid cursor format." },
        { status: 400 }
      );
    }

    const db = timing.measureSync("resolve_db", () => requireUserDb());
    const countResult = await timing.measure("db_count_collections", () =>
      db.execute({
        sql: "SELECT COUNT(*) AS total FROM collections WHERE user_id = ?",
        args: [user.userId],
      })
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const listArgs: (number | string)[] = [user.userId];
    let cursorClause = "";
    if (cursor) {
      cursorClause = "AND (c.updated_at < ? OR (c.updated_at = ? AND c.id < ?))";
      listArgs.push(cursor.updatedAt, cursor.updatedAt, cursor.id);
    }
    listArgs.push(limit + 1);

    const result = await timing.measure("db_list_collections", () =>
      db.execute({
        sql: `
        SELECT
          c.id,
          c.name,
          c.description,
          c.color,
          c.icon,
          c.is_public,
          c.created_at,
          c.updated_at,
          COUNT(ci.id) as item_count
        FROM collections c
        LEFT JOIN collection_items ci ON ci.collection_id = c.id
        WHERE c.user_id = ?
          ${cursorClause}
        GROUP BY c.id
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT ?
      `,
        args: listArgs,
      })
    );

    const mappedRows: Collection[] = timing.measureSync("serialize_rows", () =>
      result.rows.map((row) => ({
        id: row.id as number,
        name: row.name as string,
        description: row.description as string | null,
        color: row.color as string,
        icon: row.icon as string,
        isPublic: Boolean(row.is_public),
        itemCount: Number(row.item_count),
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }))
    );
    const hasMore = mappedRows.length > limit;
    const collections = hasMore ? mappedRows.slice(0, limit) : mappedRows;
    const nextCursor =
      hasMore && collections.length > 0
        ? encodeCollectionsCursor({
            updatedAt: collections[collections.length - 1].updatedAt,
            id: collections[collections.length - 1].id,
          })
        : null;

    return timing.json({ collections, total, limit, hasMore, nextCursor });
  } catch (error) {
    const response = authErrorResponse(error);
    response.headers.set("Server-Timing", timing.toHeaderValue());
    return response;
  }
}

/**
 * POST /api/user/collections
 *
 * Create a new collection.
 * Collection names must be unique per user.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!resolveProAccess(user).canAccessCollections) {
      return getFeatureDisabledResponse("collections");
    }

    const body = await request.json();
    const parseResult = CreateCollectionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, color, icon } = parseResult.data;
    const db = requireUserDb();

    try {
      const duplicateResult = await db.execute({
        sql: "SELECT id FROM collections WHERE user_id = ? AND lower(name) = lower(?) LIMIT 1",
        args: [user.userId, name],
      });

      if (duplicateResult.rows.length > 0) {
        return NextResponse.json(
          {
            error: "duplicate_collection_name",
            message: "A collection with this name already exists",
          },
          { status: 409 }
        );
      }

      const result = await db.execute({
        sql: `
          INSERT INTO collections (user_id, name, description, color, icon)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, name, description, color, icon, is_public, created_at, updated_at
        `,
        args: [
          user.userId,
          name,
          description ?? null,
          color ?? "#f97316",
          icon ?? "folder",
        ],
      });

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Failed to create collection" },
          { status: 500 }
        );
      }

      const row = result.rows[0];
      const collection: Collection = {
        id: row.id as number,
        name: row.name as string,
        description: row.description as string | null,
        color: row.color as string,
        icon: row.icon as string,
        isPublic: Boolean(row.is_public),
        itemCount: 0,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };

      return NextResponse.json(collection, { status: 201 });
    } catch (error) {
      // Handle unique constraint violation
      if (String(error).includes("UNIQUE constraint")) {
        return NextResponse.json(
          {
            error: "duplicate_collection_name",
            message: "A collection with this name already exists",
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    return authErrorResponse(error);
  }
}
