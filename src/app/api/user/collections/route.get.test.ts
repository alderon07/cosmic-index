import { describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

const db = {
  execute: async ({ sql }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("SELECT COUNT(*) AS total FROM collections WHERE user_id = ?")) {
      return { rows: [{ total: 3 }] };
    }

    if (sql.includes("FROM collections c") && sql.includes("COUNT(ci.id) as item_count")) {
      return {
        rows: [
          {
            id: 1,
            name: "Weekly Watchlist",
            description: null,
            color: "#f97316",
            icon: "folder",
            is_public: 0,
            item_count: 2,
            created_at: "2026-03-01T00:00:00.000Z",
            updated_at: "2026-03-02T00:00:00.000Z",
          },
          {
            id: 0,
            name: "Older",
            description: null,
            color: "#f97316",
            icon: "folder",
            is_public: 0,
            item_count: 0,
            created_at: "2026-02-01T00:00:00.000Z",
            updated_at: "2026-02-02T00:00:00.000Z",
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

const { GET } = await import("@/app/api/user/collections/route");

describe("GET /api/user/collections", () => {
  it("returns cursor pagination metadata when more collections exist", async () => {
    const req = new NextRequest("http://localhost/api/user/collections?limit=1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collections).toHaveLength(1);
    expect(body.limit).toBe(1);
    expect(body.hasMore).toBe(true);
    expect(typeof body.nextCursor).toBe("string");
  });

  it("returns 400 for invalid cursor format", async () => {
    const req = new NextRequest("http://localhost/api/user/collections?cursor=bad-cursor");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_cursor");
  });
});
