import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getAuthUser } from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";
import { z } from "zod";

const CheckSavedSchema = z.object({
  canonicalIds: z.array(z.string()).min(1).max(100),
});

/**
 * POST /api/user/saved-objects/check
 *
 * Check which objects from a list are saved by the user.
 * Returns a map of canonicalId -> savedObjectId (or null if not saved).
 *
 * This endpoint is used by the UI to efficiently check save status
 * for multiple objects (e.g., when rendering a grid of cards).
 *
 * For unauthenticated users, returns empty results without error
 * (graceful degradation for the UI).
 */
export async function POST(request: NextRequest) {
  try {
    // Use getAuthUser instead of requireAuth for graceful degradation
    const user = await getAuthUser();

    if (!user) {
      // Not authenticated - return empty results
      return NextResponse.json({ saved: {} });
    }

    const db = getUserDb();
    if (!db) {
      // Database not configured - return empty results
      return NextResponse.json({ saved: {} });
    }

    const body = await request.json();
    const parseResult = CheckSavedSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { canonicalIds } = parseResult.data;

    // Build query with parameterized IN clause
    const placeholders = canonicalIds.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `
        SELECT id, canonical_id
        FROM saved_objects
        WHERE user_id = ? AND canonical_id IN (${placeholders})
      `,
      args: [user.userId, ...canonicalIds],
    });

    // Build map of canonicalId -> savedObjectId
    const saved: Record<string, number> = {};
    for (const row of result.rows) {
      saved[row.canonical_id as string] = row.id as number;
    }

    return NextResponse.json({ saved });
  } catch (error) {
    return authErrorResponse(error);
  }
}
