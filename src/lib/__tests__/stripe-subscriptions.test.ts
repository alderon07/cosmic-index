import { afterEach, describe, expect, it } from "bun:test";

import {
  buildStripeSubscriptionSnapshot,
  isEntitledStripeSubscriptionRecord,
  isManageableStripeSubscriptionStatus,
  subscriptionMatchesConfiguredProPrice,
} from "@/lib/stripe-subscriptions";

const ORIGINAL_STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

afterEach(() => {
  if (ORIGINAL_STRIPE_PRO_PRICE_ID === undefined) {
    delete process.env.STRIPE_PRO_PRICE_ID;
  } else {
    process.env.STRIPE_PRO_PRICE_ID = ORIGINAL_STRIPE_PRO_PRICE_ID;
  }
});

describe("stripe-subscriptions", () => {
  it("only entitles subscriptions for the configured Pro price", () => {
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";

    expect(
      isEntitledStripeSubscriptionRecord({
        status: "active",
        priceId: "price_pro",
      })
    ).toBe(true);

    expect(
      isEntitledStripeSubscriptionRecord({
        status: "active",
        priceId: "price_other",
      })
    ).toBe(false);

    expect(
      isEntitledStripeSubscriptionRecord({
        status: "canceled",
        priceId: "price_pro",
      })
    ).toBe(false);
  });

  it("treats canceled and incomplete_expired as non-manageable", () => {
    expect(isManageableStripeSubscriptionStatus("active")).toBe(true);
    expect(isManageableStripeSubscriptionStatus("trialing")).toBe(true);
    expect(isManageableStripeSubscriptionStatus("canceled")).toBe(false);
    expect(isManageableStripeSubscriptionStatus("incomplete_expired")).toBe(
      false
    );
  });

  it("matches subscriptions using the configured Pro price", () => {
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";

    expect(
      subscriptionMatchesConfiguredProPrice({
        status: "active",
        items: {
          data: [
            {
              price: { id: "price_other", product: "prod_other" },
            },
            {
              price: { id: "price_pro", product: "prod_pro" },
            },
          ],
        },
      } as never)
    ).toBe(true);

    expect(
      subscriptionMatchesConfiguredProPrice({
        status: "active",
        items: {
          data: [{ price: { id: "price_other", product: "prod_other" } }],
        },
      } as never)
    ).toBe(false);
  });

  it("builds a normalized subscription snapshot", () => {
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";

    const snapshot = buildStripeSubscriptionSnapshot({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: 1_700_000_000,
      current_period_end: 1_700_086_400,
      ended_at: null,
      metadata: { userId: "user_123" },
      items: {
        data: [{ price: { id: "price_pro", product: "prod_pro" } }],
      },
    } as never);

    expect(snapshot).toEqual({
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_123",
      stripePriceId: "price_pro",
      stripeProductId: "prod_pro",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodStart: "2023-11-14T22:13:20.000Z",
      currentPeriodEnd: "2023-11-15T22:13:20.000Z",
      endedAt: null,
      metadataJson: JSON.stringify({ userId: "user_123" }),
    });
  });
});
