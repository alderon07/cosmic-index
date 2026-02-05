import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { UpdateSavedObjectSchema, SavedObject } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/user/saved-objects/[id]
 *
 * Get a single saved object by ID.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const objectId = parseInt(id, 10);
    if (isNaN(objectId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `
        SELECT id, canonical_id, display_name, notes, event_payload, created_at
        FROM saved_objects
        WHERE id = ? AND user_id = ?
      `,
      args: [objectId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const savedObject: SavedObject = {
      id: row.id as number,
      canonicalId: row.canonical_id as string,
      displayName: row.display_name as string,
      notes: row.notes as string | null,
      eventPayload: row.event_payload
        ? JSON.parse(row.event_payload as string)
        : null,
      createdAt: row.created_at as string,
    };

    return NextResponse.json(savedObject);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * PATCH /api/user/saved-objects/[id]
 *
 * Update a saved object's notes.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const objectId = parseInt(id, 10);
    if (isNaN(objectId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = UpdateSavedObjectSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { notes } = parseResult.data;

    // Check ownership and update
    const result = await db.execute({
      sql: `
        UPDATE saved_objects
        SET notes = ?
        WHERE id = ? AND user_id = ?
        RETURNING id, canonical_id, display_name, notes, event_payload, created_at
      `,
      args: [notes ?? null, objectId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const savedObject: SavedObject = {
      id: row.id as number,
      canonicalId: row.canonical_id as string,
      displayName: row.display_name as string,
      notes: row.notes as string | null,
      eventPayload: row.event_payload
        ? JSON.parse(row.event_payload as string)
        : null,
      createdAt: row.created_at as string,
    };

    return NextResponse.json(savedObject);
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/user/saved-objects/[id]
 *
 * Remove a saved object. Also removes it from any collections (CASCADE).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const db = requireUserDb();
    const { id } = await params;

    const objectId = parseInt(id, 10);
    if (isNaN(objectId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Delete with ownership check
    const result = await db.execute({
      sql: "DELETE FROM saved_objects WHERE id = ? AND user_id = ? RETURNING id",
      args: [objectId, user.userId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
