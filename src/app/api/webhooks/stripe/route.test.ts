import { beforeEach, describe, expect, it, mock } from "bun:test";

type MockEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      cancel_at_period_end: boolean;
      ended_at: number | null;
      metadata?: Record<string, string>;
      items: {
        data: Array<{
          current_period_start: number;
          current_period_end: number;
          price: {
            id: string;
            product: string;
          };
        }>;
      };
    };
  };
};

let currentEvent: MockEvent;
const executedSql: string[] = [];
const insertedSubscriptions: Array<{
  stripe_subscription_id: string;
  status: string;
  stripe_price_id: string;
}> = [];
const updatedUsers: Array<unknown[]> = [];

const mockDbExecute = mock(async ({ sql, args }: { sql: string; args?: unknown[] }) => {
  executedSql.push(sql);

  if (sql.includes("SELECT id FROM stripe_events WHERE id = ? LIMIT 1")) {
    return { rows: [] };
  }

  if (sql.includes("SELECT user_id FROM stripe_subscriptions WHERE stripe_customer_id = ? LIMIT 1")) {
    return { rows: [] };
  }

  if (sql.includes("SELECT id FROM users WHERE stripe_customer_id = ?")) {
    return { rows: [{ id: "user_123" }] };
  }

  if (sql.includes("INSERT INTO stripe_subscriptions")) {
    insertedSubscriptions.push({
      stripe_subscription_id: String(args?.[1] ?? ""),
      status: String(args?.[5] ?? ""),
      stripe_price_id: String(args?.[3] ?? ""),
    });
    return { rows: [] };
  }

  if (sql.includes("SELECT stripe_subscription_id, status, stripe_price_id")) {
    return {
      rows: insertedSubscriptions,
    };
  }

  if (sql.includes("UPDATE users") && sql.includes("SET tier = ?")) {
    updatedUsers.push(args ?? []);
    return { rows: [] };
  }

  if (sql.includes("INSERT INTO stripe_events (id, event_type) VALUES (?, ?)")) {
    return { rows: [] };
  }

  throw new Error(`Unhandled SQL in test: ${sql}`);
});

mock.module("@/lib/user-db", () => ({
  getUserDb: () => ({
    execute: (...args: Parameters<typeof mockDbExecute>) => mockDbExecute(...args),
  }),
}));

mock.module("@/lib/stripe", () => ({
  requireStripe: () => ({
    webhooks: {
      constructEvent: () => currentEvent,
    },
  }),
}));

const { POST } = await import("@/app/api/webhooks/stripe/route");

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_PRO_PRICE_ID = "price_live_pro";

  currentEvent = {
    id: "evt_123",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_123",
        customer: "cus_123",
        status: "active",
        cancel_at_period_end: false,
        ended_at: null,
        metadata: {},
        items: {
          data: [
            {
              current_period_start: 1_700_000_000,
              current_period_end: 1_700_086_400,
              price: {
                id: "price_live_pro",
                product: "prod_live_pro",
              },
            },
          ],
        },
      },
    },
  };

  executedSql.length = 0;
  insertedSubscriptions.length = 0;
  updatedUsers.length = 0;
  mockDbExecute.mockClear();
});

describe("POST /api/webhooks/stripe", () => {
  it("resolves the user via customer id without consulting users.stripe_subscription_id", async () => {
    const request = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: {
        "stripe-signature": "t=1,v1=test",
      },
      body: JSON.stringify({ ok: true }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(200);

    expect(
      executedSql.some((sql) =>
        sql.includes("SELECT id FROM users WHERE stripe_subscription_id = ? LIMIT 1")
      )
    ).toBe(false);

    expect(
      executedSql.some((sql) =>
        sql.includes("SELECT user_id FROM stripe_subscriptions WHERE stripe_customer_id = ? LIMIT 1")
      )
    ).toBe(true);

    expect(updatedUsers).toEqual([["pro", "user_123"]]);
  });
});
