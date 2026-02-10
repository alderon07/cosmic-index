import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireUserDb } from "@/lib/user-db";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { listCollectionsForSavedObject } from "@/lib/mock-user-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/user/saved-objects/[id]/collections
 *
 * List all user collections with membership status for a specific saved object.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const savedObjectId = Number.parseInt(id, 10);
    if (!Number.isFinite(savedObjectId)) {
      return NextResponse.json(
        { error: "invalid_id", message: "Invalid ID." },
        { status: 400 }
      );
    }

    if (isMockUserStoreEnabled()) {
      const collections = listCollectionsForSavedObject(user.userId, savedObjectId);
      if (!collections) {
        return NextResponse.json(
          { error: "resource_not_found", message: "Resource not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        savedObjectId,
        collections,
      });
    }

    const db = requireUserDb();

    const objectResult = await db.execute({
      sql: "SELECT id FROM saved_objects WHERE id = ? AND user_id = ?",
      args: [savedObjectId, user.userId],
    });

    if (objectResult.rows.length === 0) {
      return NextResponse.json(
        { error: "resource_not_found", message: "Resource not found." },
        { status: 404 }
      );
    }

    const result = await db.execute({
      sql: `
        SELECT
          c.id,
          c.name,
          c.updated_at,
          COUNT(ci.id) as item_count,
          MAX(CASE WHEN ci.saved_object_id = ? THEN 1 ELSE 0 END) as is_member
        FROM collections c
        LEFT JOIN collection_items ci ON ci.collection_id = c.id
        WHERE c.user_id = ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC, c.id DESC
      `,
      args: [savedObjectId, user.userId],
    });

    return NextResponse.json({
      savedObjectId,
      collections: result.rows.map((row) => ({
        id: row.id as number,
        name: row.name as string,
        itemCount: Number(row.item_count ?? 0),
        isMember: Boolean(Number(row.is_member ?? 0)),
        updatedAt: row.updated_at as string,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
