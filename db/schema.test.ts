import { describe, expect, it } from "bun:test";

describe("canonical user schema", () => {
  it("declares the post-migration users table before dependent tables", async () => {
    const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();
    const usersStart = schema.indexOf("CREATE TABLE IF NOT EXISTS users");
    const subscriptionsStart = schema.indexOf("CREATE TABLE IF NOT EXISTS stripe_subscriptions");

    expect(usersStart).toBeGreaterThan(-1);
    expect(usersStart).toBeLessThan(subscriptionsStart);

    const usersBlock = schema.slice(usersStart, subscriptionsStart);
    expect(usersBlock).toContain("id TEXT PRIMARY KEY");
    expect(usersBlock).toContain("email TEXT NOT NULL");
    expect(usersBlock).toContain("tier TEXT NOT NULL DEFAULT 'free'");
    expect(usersBlock).toContain("stripe_customer_id TEXT");
    expect(usersBlock).toContain("created_at TEXT");
    expect(usersBlock).toContain("updated_at TEXT");
    expect(usersBlock).not.toContain("stripe_subscription_id");
    expect(schema).toContain("CREATE INDEX IF NOT EXISTS idx_users_stripe_customer");
    expect(schema).toContain("idx_stripe_subscriptions_user_price_status");
    expect(schema).not.toContain("idx_users_tier");
  });
});
