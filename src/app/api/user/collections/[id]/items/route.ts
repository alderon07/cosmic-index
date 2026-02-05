import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { AddToCollectionSchema } from "@/lib/types";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const RemoveFromCollectionSchema = z.object({
  savedObjectId: z.number().int().positive(),
});

/**
 * POST /api/user/collections/[id]/items
 *
 * Add a saved object to a collection.
 * The saved object must belong to the authenticated user.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const collectionId = parseInt(id, 10);
    if (isNaN(collectionId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = AddToCollectionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { savedObjectId, position } = parseResult.data;

    // Verify collection ownership
    const collectionCheck = await db.execute({
      sql: "SELECT id FROM collections WHERE id = ? AND user_id = ?",
      args: [collectionId, user.userId],
    });

    if (collectionCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Verify saved object ownership
    const objectCheck = await db.execute({
      sql: "SELECT id FROM saved_objects WHERE id = ? AND user_id = ?",
      args: [savedObjectId, user.userId],
    });

    if (objectCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Saved object not found" },
        { status: 404 }
      );
    }

    // Get next position if not specified
    let itemPosition = position;
    if (itemPosition === undefined) {
      const maxResult = await db.execute({
        sql: "SELECT MAX(position) as max_pos FROM collection_items WHERE collection_id = ?",
        args: [collectionId],
      });
      const maxPos = maxResult.rows[0]?.max_pos as number | null;
      itemPosition = (maxPos ?? -1) + 1;
    }

    try {
      await db.execute({
        sql: `
          INSERT INTO collection_items (collection_id, saved_object_id, position)
          VALUES (?, ?, ?)
        `,
        args: [collectionId, savedObjectId, itemPosition],
      });

      // Update collection's updated_at
      await db.execute({
        sql: 'UPDATE collections SET updated_at = datetime("now") WHERE id = ?',
        args: [collectionId],
      });

      return NextResponse.json({ success: true, position: itemPosition }, { status: 201 });
    } catch (error) {
      if (String(error).includes("UNIQUE constraint")) {
        return NextResponse.json(
          { error: "Item already in collection" },
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
 * DELETE /api/user/collections/[id]/items
 *
 * Remove a saved object from a collection.
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

    const body = await request.json();
    const parseResult = RemoveFromCollectionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { savedObjectId } = parseResult.data;

    // Verify collection ownership (implicitly through join)
    const result = await db.execute({
      sql: `
        DELETE FROM collection_items
        WHERE collection_id = ? AND saved_object_id = ?
          AND collection_id IN (SELECT id FROM collections WHERE user_id = ?)
        RETURNING id
      `,
      args: [collectionId, savedObjectId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Item not in collection" }, { status: 404 });
    }

    // Update collection's updated_at
    await db.execute({
      sql: 'UPDATE collections SET updated_at = datetime("now") WHERE id = ?',
      args: [collectionId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
