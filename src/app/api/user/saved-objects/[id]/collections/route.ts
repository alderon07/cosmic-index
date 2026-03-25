import { requireAuth, authErrorResponse } from "@/lib/auth";
import { resolveProAccess } from "@/lib/pro-access";
import { requireUserDb } from "@/lib/user-db";
import { ServerTiming } from "@/lib/server-timing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/user/saved-objects/[id]/collections
 *
 * List all user collections with membership status for a specific saved object.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const timing = new ServerTiming();
  try {
    const user = await timing.measure("auth", () => requireAuth());
    if (!resolveProAccess(user).canAccessCollections) {
      return timing.json({ error: "feature_disabled", feature: "collections" }, { status: 403 });
    }
    const { id } = await timing.measure("resolve_params", () => params);

    const savedObjectId = Number.parseInt(id, 10);
    if (!Number.isFinite(savedObjectId)) {
      return timing.json(
        { error: "invalid_id", message: "Invalid ID." },
        { status: 400 }
      );
    }

    const db = timing.measureSync("resolve_db", () => requireUserDb());

    const objectResult = await timing.measure("db_get_saved_object", () =>
      db.execute({
        sql: "SELECT id FROM saved_objects WHERE id = ? AND user_id = ?",
        args: [savedObjectId, user.userId],
      })
    );

    if (objectResult.rows.length === 0) {
      return timing.json(
        { error: "resource_not_found", message: "Resource not found." },
        { status: 404 }
      );
    }

    const result = await timing.measure("db_list_membership", () =>
      db.execute({
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
      })
    );

    return timing.json({
      savedObjectId,
      collections: timing.measureSync("serialize_rows", () =>
        result.rows.map((row) => ({
          id: row.id as number,
          name: row.name as string,
          itemCount: Number(row.item_count ?? 0),
          isMember: Boolean(Number(row.is_member ?? 0)),
          updatedAt: row.updated_at as string,
        }))
      ),
    });
  } catch (error) {
    const response = authErrorResponse(error);
    response.headers.set("Server-Timing", timing.toHeaderValue());
    return response;
  }
}
