import { describe, expect, it } from "bun:test";
import { createClient } from "@libsql/client";
import { resolveAdEligibility } from "@/lib/ad-eligibility";

type Row = { tier?: unknown; has_entitled_subscription?: unknown };

function databaseWith(rows: Row[]) {
  return {
    execute: async () => ({ rows }),
  };
}

async function databaseWithSubscriptionLedger(options: {
  tier: "free" | "pro";
  subscriptions?: Array<{
    priceId: string;
    status: string;
    cancelAtPeriodEnd?: boolean;
  }>;
}) {
  const database = createClient({ url: ":memory:" });
  await database.executeMultiple(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      tier TEXT NOT NULL
    );
    CREATE TABLE stripe_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      stripe_subscription_id TEXT NOT NULL UNIQUE,
      stripe_customer_id TEXT NOT NULL,
      stripe_price_id TEXT,
      status TEXT NOT NULL,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT 0
    );
    CREATE INDEX idx_stripe_subscriptions_user_price_status
      ON stripe_subscriptions(user_id, stripe_price_id, status);
  `);
  await database.execute({
    sql: "INSERT INTO users (id, email, tier) VALUES (?, ?, ?)",
    args: ["user_one", "user@example.com", options.tier],
  });

  for (const [index, subscription] of (options.subscriptions ?? []).entries()) {
    await database.execute({
      sql: `
        INSERT INTO stripe_subscriptions (
          user_id,
          stripe_subscription_id,
          stripe_customer_id,
          stripe_price_id,
          status,
          cancel_at_period_end
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        "user_one",
        `sub_${index}`,
        "cus_one",
        subscription.priceId,
        subscription.status,
        subscription.cancelAtPeriodEnd ? 1 : 0,
      ],
    });
  }

  return database;
}

describe("database-backed ad eligibility", () => {
  it("allows a free user without an entitled subscription", async () => {
    await expect(
      resolveAdEligibility(databaseWith([{ tier: "free", has_entitled_subscription: 0 }]), {
        userId: "user_free",
        proPriceId: "price_pro",
      })
    ).resolves.toBe(true);
  });

  it.each([
    { tier: "pro", has_entitled_subscription: 0 },
    { tier: "free", has_entitled_subscription: 1 },
    { tier: "free", has_entitled_subscription: true },
  ])("suppresses a Pro tier or entitled ledger row", async (row) => {
    await expect(
      resolveAdEligibility(databaseWith([row]), {
        userId: "user_pro",
        proPriceId: "price_pro",
      })
    ).resolves.toBe(false);
  });

  it("uses a single conservative indexed EXISTS query", async () => {
    let captured: { sql: string; args?: unknown[] } | undefined;
    const db = {
      execute: async (statement: { sql: string; args?: unknown[] }) => {
        captured = statement;
        return { rows: [{ tier: "free", has_entitled_subscription: 0 }] };
      },
    };

    await resolveAdEligibility(db, {
      userId: "user_one",
      proPriceId: "price_pro",
    });

    expect(captured?.sql).toContain("EXISTS");
    expect(captured?.sql).toContain("stripe_subscriptions.user_id = users.id");
    expect(captured?.sql).toContain("stripe_subscriptions.stripe_price_id = ?");
    expect(captured?.sql).toContain("IN ('active', 'trialing')");
    expect(captured?.args).toEqual(["price_pro", "user_one"]);
  });

  it.each([
    [],
    [{ tier: "enterprise", has_entitled_subscription: 0 }],
    [{ tier: "free", has_entitled_subscription: "maybe" }],
  ])("fails closed for missing or invalid rows", async (rows) => {
    await expect(
      resolveAdEligibility(databaseWith(rows), {
        userId: "user_one",
        proPriceId: "price_pro",
      })
    ).rejects.toThrow("Ad eligibility unavailable");
  });

  it("fails closed when the configured Pro price is missing", async () => {
    await expect(
      resolveAdEligibility(databaseWith([]), {
        userId: "user_one",
        proPriceId: undefined,
      })
    ).rejects.toThrow("Ad eligibility unavailable");
  });

  it("fails closed when the configured Pro price is blank", async () => {
    await expect(
      resolveAdEligibility(
        databaseWith([{ tier: "free", has_entitled_subscription: 0 }]),
        {
        userId: "user_one",
        proPriceId: "   ",
        }
      )
    ).rejects.toThrow("Ad eligibility unavailable");
  });

  it("fails closed on database errors", async () => {
    const db = {
      execute: async () => {
        throw new Error("database offline");
      },
    };

    await expect(
      resolveAdEligibility(db, { userId: "user_one", proPriceId: "price_pro" })
    ).rejects.toThrow("Ad eligibility unavailable");
  });

  it.each(["active", "trialing"])(
    "vetoes a free tier with a configured-price %s subscription",
    async (status) => {
      const database = await databaseWithSubscriptionLedger({
        tier: "free",
        subscriptions: [{ priceId: "price_pro", status }],
      });

      await expect(
        resolveAdEligibility(database, {
          userId: "user_one",
          proPriceId: "price_pro",
        })
      ).resolves.toBe(false);
      database.close();
    }
  );

  it("keeps cancel-at-period-end active subscriptions ad-free", async () => {
    const database = await databaseWithSubscriptionLedger({
      tier: "free",
      subscriptions: [
        {
          priceId: "price_pro",
          status: "active",
          cancelAtPeriodEnd: true,
        },
      ],
    });

    await expect(
      resolveAdEligibility(database, {
        userId: "user_one",
        proPriceId: "price_pro",
      })
    ).resolves.toBe(false);
    database.close();
  });

  it("does not veto a different price or non-entitled ledger status", async () => {
    const database = await databaseWithSubscriptionLedger({
      tier: "free",
      subscriptions: [
        { priceId: "price_other", status: "active" },
        { priceId: "price_pro", status: "past_due" },
      ],
    });

    await expect(
      resolveAdEligibility(database, {
        userId: "user_one",
        proPriceId: "price_pro",
      })
    ).resolves.toBe(true);
    database.close();
  });

  it("uses conservative EXISTS behavior across multiple subscriptions", async () => {
    const database = await databaseWithSubscriptionLedger({
      tier: "free",
      subscriptions: [
        { priceId: "price_pro", status: "canceled" },
        { priceId: "price_pro", status: "trialing" },
      ],
    });

    await expect(
      resolveAdEligibility(database, {
        userId: "user_one",
        proPriceId: "price_pro",
      })
    ).resolves.toBe(false);
    database.close();
  });
});
