import { describe, expect, it, mock } from "bun:test";

let mockCanAccessCollections = true;

const db = {
  execute: async ({ sql, args }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("SELECT id FROM saved_objects WHERE id = ? AND user_id = ?")) {
      const id = Number(args?.[0]);
      if (id === 42) return { rows: [{ id: 42 }] };
      return { rows: [] };
    }

    if (sql.includes("FROM collections c") && sql.includes("MAX(CASE WHEN ci.saved_object_id")) {
      return {
        rows: [
          {
            id: 1,
            name: "Weekly Watchlist",
            item_count: 2,
            is_member: 1,
            updated_at: "2026-02-10T00:00:00.000Z",
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
}));

const { GET } = await import("@/app/api/user/saved-objects/[id]/collections/route");

describe("GET /api/user/saved-objects/[id]/collections", () => {
  it("returns collections with membership for a saved object", async () => {
    const response = await GET(new Request("http://localhost/api/user/saved-objects/42/collections"), {
      params: Promise.resolve({ id: "42" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.savedObjectId).toBe(42);
    expect(payload.collections).toHaveLength(1);
    expect(payload.collections[0].isMember).toBe(true);
  });

  it("returns 400 for invalid saved object id", async () => {
    const response = await GET(new Request("http://localhost/api/user/saved-objects/abc/collections"), {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when saved object is not found", async () => {
    const response = await GET(new Request("http://localhost/api/user/saved-objects/9/collections"), {
      params: Promise.resolve({ id: "9" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 403 when collections are not publicly enabled", async () => {
    mockCanAccessCollections = false;

    const response = await GET(new Request("http://localhost/api/user/saved-objects/42/collections"), {
      params: Promise.resolve({ id: "42" }),
    });

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.feature).toBe("collections");

    mockCanAccessCollections = true;
  });
});
