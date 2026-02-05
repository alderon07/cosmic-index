import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { CreateCollectionSchema, Collection } from "@/lib/types";

/**
 * GET /api/user/collections
 *
 * List all collections for the authenticated user.
 * Includes item count for each collection.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const db = requireUserDb();

    const result = await db.execute({
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
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `,
      args: [user.userId],
    });

    const collections: Collection[] = result.rows.map((row) => ({
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | null,
      color: row.color as string,
      icon: row.icon as string,
      isPublic: Boolean(row.is_public),
      itemCount: Number(row.item_count),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));

    return NextResponse.json({ collections });
  } catch (error) {
    return authErrorResponse(error);
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
    const db = requireUserDb();

    const body = await request.json();
    const parseResult = CreateCollectionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, color, icon } = parseResult.data;

    try {
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
          { error: "A collection with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    return authErrorResponse(error);
  }
}
