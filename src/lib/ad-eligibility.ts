import { z } from "zod";
import type { Client } from "@libsql/client";

const entitlementRowSchema = z
  .object({
    tier: z.enum(["free", "pro"]),
    has_entitled_subscription: z.union([z.literal(0), z.literal(1), z.boolean()]),
  })
  .strict();

type EligibilityDatabase = Pick<Client, "execute">;

interface ResolveAdEligibilityOptions {
  userId: string;
  proPriceId: string | undefined;
}

export class AdEligibilityUnavailableError extends Error {
  constructor() {
    super("Ad eligibility unavailable");
    this.name = "AdEligibilityUnavailableError";
  }
}

export async function resolveAdEligibility(
  database: EligibilityDatabase,
  { userId, proPriceId }: ResolveAdEligibilityOptions
): Promise<boolean> {
  const normalizedProPriceId = proPriceId?.trim();
  if (!normalizedProPriceId) {
    throw new AdEligibilityUnavailableError();
  }

  try {
    const result = await database.execute({
      sql: `
        SELECT
          users.tier,
          EXISTS (
            SELECT 1
            FROM stripe_subscriptions
            WHERE stripe_subscriptions.user_id = users.id
              AND stripe_subscriptions.stripe_price_id = ?
              AND stripe_subscriptions.status IN ('active', 'trialing')
          ) AS has_entitled_subscription
        FROM users
        WHERE users.id = ?
        LIMIT 1
      `,
      args: [normalizedProPriceId, userId],
    });

    if (result.rows.length !== 1) {
      throw new AdEligibilityUnavailableError();
    }

    const parsed = entitlementRowSchema.safeParse(result.rows[0]);
    if (!parsed.success) {
      throw new AdEligibilityUnavailableError();
    }

    return (
      parsed.data.tier === "free" &&
      parsed.data.has_entitled_subscription !== 1 &&
      parsed.data.has_entitled_subscription !== true
    );
  } catch (error) {
    if (error instanceof AdEligibilityUnavailableError) throw error;
    throw new AdEligibilityUnavailableError();
  }
}
