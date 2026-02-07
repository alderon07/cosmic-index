import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { SaveObjectInputSchema, SavedObject } from "@/lib/types";
import { parseCanonicalId } from "@/lib/canonical-id";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { listSavedObjects, saveObject } from "@/lib/mock-user-store";

/**
 * GET /api/user/saved-objects
 *
 * List all saved objects for the authenticated user.
 * Returns objects sorted by creation date (most recent first).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

    if (isMockUserStoreEnabled()) {
      const result = listSavedObjects(user.userId, page, limit);
      return NextResponse.json({
        objects: result.objects,
        total: result.total,
        page,
        limit,
        hasMore: result.hasMore,
      });
    }

    const db = requireUserDb();
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as total FROM saved_objects WHERE user_id = ?",
      args: [user.userId],
    });
    const total = Number(countResult.rows[0]?.total ?? 0);

    // Get paginated results
    const result = await db.execute({
      sql: `
        SELECT id, canonical_id, display_name, notes, event_payload, created_at
        FROM saved_objects
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [user.userId, limit, offset],
    });

    const objects: SavedObject[] = result.rows.map((row) => ({
      id: row.id as number,
      canonicalId: row.canonical_id as string,
      displayName: row.display_name as string,
      notes: row.notes as string | null,
      eventPayload: row.event_payload
        ? JSON.parse(row.event_payload as string)
        : null,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({
      objects,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return authErrorResponse(error);
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

    const body = await request.json();
    const parseResult = SaveObjectInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { canonicalId, displayName, notes, eventPayload } = parseResult.data;

    // Validate canonical ID format
    const parsed = parseCanonicalId(canonicalId);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid canonical ID format" },
        { status: 400 }
      );
    }

    if (isMockUserStoreEnabled()) {
      const savedObject = saveObject({
        userId: user.userId,
        canonicalId,
        displayName,
        notes: notes ?? null,
        eventPayload: eventPayload ?? null,
      });

      return NextResponse.json(savedObject, { status: 201 });
    }

    const db = requireUserDb();

    // Upsert: INSERT OR REPLACE based on unique constraint
    // This handles the case where user saves the same object twice
    await db.execute({
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

    // Fetch the saved/updated record
    const result = await db.execute({
      sql: `
        SELECT id, canonical_id, display_name, notes, event_payload, created_at
        FROM saved_objects
        WHERE user_id = ? AND canonical_id = ?
      `,
      args: [user.userId, canonicalId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to save object" },
        { status: 500 }
      );
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

    return NextResponse.json(savedObject, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
