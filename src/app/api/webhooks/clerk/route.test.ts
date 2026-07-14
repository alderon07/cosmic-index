import { beforeAll, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

const execute = mock(async () => ({ rows: [], rowsAffected: 1 }));
let event: { type: string; data: { id?: string | null } } = {
  type: "user.deleted",
  data: { id: "user_123" },
};

mock.module("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: async () => event,
}));

mock.module("@/lib/user-db", () => ({
  requireUserDb: () => ({ execute }),
}));

let POST: typeof import("@/app/api/webhooks/clerk/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/webhooks/clerk/route"));
});

describe("POST /api/webhooks/clerk", () => {
  it("deletes the local user row for a verified user.deleted event", async () => {
    execute.mockClear();
    event = { type: "user.deleted", data: { id: "user_123" } };

    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
    }));

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      sql: "DELETE FROM users WHERE id = ?",
      args: ["user_123"],
    });
  });

  it("ignores unrelated verified events", async () => {
    execute.mockClear();
    event = { type: "user.updated", data: { id: "user_123" } };

    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
    }));

    expect(response.status).toBe(200);
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects deletion events without a user id", async () => {
    event = { type: "user.deleted", data: { id: null } };

    const response = await POST(new NextRequest("http://localhost/api/webhooks/clerk", {
      method: "POST",
    }));

    expect(response.status).toBe(400);
  });
});
