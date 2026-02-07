import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserDb } from "@/lib/user-db";
import { BillingContent } from "./billing-content";
import { getAuthUser } from "@/lib/auth";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { getMockUserRecord } from "@/lib/mock-user-store";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your Cosmic Index subscription",
};

/**
 * Billing Settings Page
 *
 * Server component that:
 * 1. Checks authentication (redirects if not signed in)
 * 2. Fetches user tier from database or mock store
 * 3. Renders client component with tier info
 */
export default async function BillingPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/");
  }

  // Fetch tier from database (source of truth)
  let tier: "free" | "pro" = user.tier;
  let hasStripeCustomer = false;

  if (isMockUserStoreEnabled()) {
    const mockUser = getMockUserRecord(user.userId);
    tier = mockUser.tier;
    hasStripeCustomer = Boolean(mockUser.stripeCustomerId);
  } else {
    const db = getUserDb();
    if (db) {
      const result = await db.execute({
        sql: "SELECT tier, stripe_customer_id FROM users WHERE id = ?",
        args: [user.userId],
      });

      if (result.rows.length > 0) {
        tier = (result.rows[0].tier as "free" | "pro") ?? "free";
        hasStripeCustomer = !!result.rows[0].stripe_customer_id;
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="font-display text-2xl tracking-wide mb-6">Billing</h1>

      <BillingContent
        tier={tier}
        hasStripeCustomer={hasStripeCustomer}
      />
    </div>
  );
}
