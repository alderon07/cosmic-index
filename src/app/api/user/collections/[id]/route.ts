import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { UpdateCollectionSchema, Collection, SavedObject } from "@/lib/types";

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
    const db = requireUserDb();
    const { id } = await params;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    // Get items in collection
    const itemsResult = await db.execute({
      sql: `
        SELECT
          so.id,
          so.canonical_id,
          so.display_name,
          so.notes,
          so.event_payload,
          so.created_at,
          ci.position
        FROM collection_items ci
        JOIN saved_objects so ON so.id = ci.saved_object_id
        WHERE ci.collection_id = ?
        ORDER BY ci.position ASC, ci.added_at DESC
      `,
      args: [collectionId],
    });

    const items: (SavedObject & { position: number })[] = itemsResult.rows.map(
      (row) => ({
        id: row.id as number,
        canonicalId: row.canonical_id as string,
        displayName: row.display_name as string,
        notes: row.notes as string | null,
        eventPayload: row.event_payload
          ? JSON.parse(row.event_payload as string)
          : null,
        createdAt: row.created_at as string,
        position: row.position as number,
      })
    );

    return NextResponse.json({
      collection,
      items,
      itemCount: items.length,
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
    const db = requireUserDb();
    const { id } = await params;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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

    // Build dynamic UPDATE query
    const setClauses: string[] = ['updated_at = datetime("now")'];
    const args: (string | number | boolean)[] = [];

    if (updates.name !== undefined) {
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
        return NextResponse.json({ error: "Not found" }, { status: 404 });
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

/**
 * DELETE /api/user/collections/[id]
 *
 * Delete a collection. Items are automatically removed via CASCADE.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.execute({
      sql: "DELETE FROM collections WHERE id = ? AND user_id = ? RETURNING id",
      args: [collectionId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
