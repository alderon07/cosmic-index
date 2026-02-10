import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { UpdateCollectionSchema, Collection } from "@/lib/types";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import {
  deleteCollection,
  getCollectionWithItems,
  updateCollection,
} from "@/lib/mock-user-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/user/collections/[id]
 *
 * Get a collection with its items (saved objects).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "24", 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(100, parsedLimit)
        : 24;
    const offset = (page - 1) * limit;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "invalid_id", message: "Invalid ID." },
        { status: 400 }
      );
    }

    if (isMockUserStoreEnabled()) {
      const result = getCollectionWithItems(user.userId, collectionId);
      if (!result) {
        return NextResponse.json(
          { error: "resource_not_found", message: "Resource not found." },
          { status: 404 }
        );
      }

      const paginatedItems = result.items.slice(offset, offset + limit).map((item) => ({
        id: item.id,
        canonicalId: item.canonicalId,
        displayName: item.displayName,
        notes: item.notes,
        createdAt: item.createdAt,
        position: item.position,
      }));
      return NextResponse.json({
        collection: result.collection,
        items: paginatedItems,
        itemCount: result.items.length,
        page,
        limit,
        hasMore: page * limit < result.items.length,
      });
    }

    const db = requireUserDb();

    // Get collection
    const collectionResult = await db.execute({
      sql: `
        SELECT id, name, description, color, icon, is_public, created_at, updated_at
        FROM collections
        WHERE id = ? AND user_id = ?
      `,
      args: [collectionId, user.userId],
    });

    if (collectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "resource_not_found", message: "Resource not found." },
        { status: 404 }
      );
    }

    const row = collectionResult.rows[0];
    const collection: Collection = {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | null,
      color: row.color as string,
      icon: row.icon as string,
      isPublic: Boolean(row.is_public),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as total FROM collection_items WHERE collection_id = ?",
      args: [collectionId],
    });
    const itemCount = Number(countResult.rows[0]?.total ?? 0);

    // Get items in collection
    const itemsResult = await db.execute({
      sql: `
        SELECT
          so.id,
          so.canonical_id,
          so.display_name,
          so.notes,
          so.created_at,
          ci.position
        FROM collection_items ci
        JOIN saved_objects so ON so.id = ci.saved_object_id
        WHERE ci.collection_id = ?
        ORDER BY ci.position ASC, ci.added_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [collectionId, limit, offset],
    });

    const items = itemsResult.rows.map((row) => ({
        id: row.id as number,
        canonicalId: row.canonical_id as string,
        displayName: row.display_name as string,
        notes: row.notes as string | null,
        createdAt: row.created_at as string,
        position: row.position as number,
      }));

    return NextResponse.json({
      collection,
      items,
      itemCount,
      page,
      limit,
      hasMore: page * limit < itemCount,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/user/collections/[id]
 *
 * Update a collection's metadata.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "invalid_id", message: "Invalid ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parseResult = UpdateCollectionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parseResult.data;

    if (isMockUserStoreEnabled()) {
      const updated = updateCollection(user.userId, collectionId, updates);
      if (!updated) {
        return NextResponse.json(
          { error: "resource_not_found", message: "Resource not found." },
          { status: 404 }
        );
      }
      if (updated === "DUPLICATE") {
        return NextResponse.json(
          {
            error: "duplicate_collection_name",
            message: "A collection with this name already exists",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(updated);
    }

    const db = requireUserDb();

    // Build dynamic UPDATE query
    const setClauses: string[] = ['updated_at = datetime("now")'];
    const args: (string | number | boolean)[] = [];

    if (updates.name !== undefined) {
      const duplicateResult = await db.execute({
        sql: `
          SELECT id
          FROM collections
          WHERE user_id = ? AND id != ? AND lower(name) = lower(?)
          LIMIT 1
        `,
        args: [user.userId, collectionId, updates.name],
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

      setClauses.push("name = ?");
      args.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push("description = ?");
      args.push(updates.description);
    }
    if (updates.color !== undefined) {
      setClauses.push("color = ?");
      args.push(updates.color);
    }
    if (updates.icon !== undefined) {
      setClauses.push("icon = ?");
      args.push(updates.icon);
    }
    if (updates.isPublic !== undefined) {
      setClauses.push("is_public = ?");
      args.push(updates.isPublic ? 1 : 0);
    }

    args.push(collectionId, user.userId);

    try {
      const result = await db.execute({
        sql: `
          UPDATE collections
          SET ${setClauses.join(", ")}
          WHERE id = ? AND user_id = ?
          RETURNING id, name, description, color, icon, is_public, created_at, updated_at
        `,
        args,
      });

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "resource_not_found", message: "Resource not found." },
          { status: 404 }
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
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      };

      return NextResponse.json(collection);
    } catch (error) {
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

/**
 * DELETE /api/user/collections/[id]
 *
 * Delete a collection. Items are automatically removed via CASCADE.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json(
        { error: "invalid_id", message: "Invalid ID." },
        { status: 400 }
      );
    }

    if (isMockUserStoreEnabled()) {
      const deleted = deleteCollection(user.userId, collectionId);
      if (!deleted) {
        return NextResponse.json(
          { error: "resource_not_found", message: "Resource not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    const db = requireUserDb();

    const result = await db.execute({
      sql: "DELETE FROM collections WHERE id = ? AND user_id = ? RETURNING id",
      args: [collectionId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "resource_not_found", message: "Resource not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
