import { describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

let mockCanAccessCollections = true;

const db = {
  execute: async ({ sql }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("FROM collections") && sql.includes("WHERE id = ? AND user_id = ?")) {
      return {
        rows: [
          {
            id: 5,
            name: "Weekly Watchlist",
            description: null,
            color: "#f97316",
            icon: "folder",
            is_public: 0,
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-02T00:00:00.000Z",
          },
        ],
      };
    }

    if (sql.includes("SELECT COUNT(*) as total FROM collection_items WHERE collection_id = ?")) {
      return { rows: [{ total: 2 }] };
    }

    if (sql.includes("FROM collection_items ci") && sql.includes("JOIN saved_objects so")) {
      return {
        rows: [
          {
            id: 11,
            canonical_id: "exoplanet:Kepler-22b",
            display_name: "Kepler-22b",
            notes: null,
            created_at: "2026-03-01T00:00:00.000Z",
            position: 0,
          },
          {
            id: 12,
            canonical_id: "star:TRAPPIST-1",
            display_name: "TRAPPIST-1",
            notes: null,
            created_at: "2026-03-02T00:00:00.000Z",
            position: 1,
          },
        ],
      };
    }

    return { rows: [] };
  },
};

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => ({ userId: "user-1", tier: "free", isPro: false, email: "user@example.com" }),
  requireAuth: async () => ({ userId: "user-1", tier: "free", isPro: false, email: "user@example.com" }),
  requirePro: async () => ({ userId: "user-1", tier: "pro", isPro: true, email: "user@example.com" }),
  authErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: String(error) }), { status: 401 }),
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => db,
  requireUserDb: () => db,
}));

mock.module("@/lib/pro-access", () => ({
  resolveProAccess: () => ({
    canAccessCollections: mockCanAccessCollections,
  }),
  getFeatureDisabledResponse: (feature: string) =>
    new Response(JSON.stringify({ error: "feature_disabled", feature }), { status: 403 }),
}));

const { GET } = await import("@/app/api/user/collections/[id]/route");

describe("GET /api/user/collections/[id]", () => {
  it("returns cursor pagination metadata for collection items", async () => {
    const req = new NextRequest("http://localhost/api/user/collections/5?limit=1");
    const res = await GET(req, {
      params: Promise.resolve({ id: "5" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.limit).toBe(1);
    expect(body.hasMore).toBe(true);
    expect(typeof body.nextCursor).toBe("string");
  });

  it("returns 400 for invalid cursor format", async () => {
    const req = new NextRequest("http://localhost/api/user/collections/5?cursor=bad-cursor");
    const res = await GET(req, {
      params: Promise.resolve({ id: "5" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_cursor");
  });

  it("returns 403 when collections are not publicly enabled", async () => {
    mockCanAccessCollections = false;

    const req = new NextRequest("http://localhost/api/user/collections/5");
    const res = await GET(req, {
      params: Promise.resolve({ id: "5" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.feature).toBe("collections");

    mockCanAccessCollections = true;
  });
});
