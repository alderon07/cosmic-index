import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserDb } from "@/lib/user-db";
import { BillingContent } from "./billing-content";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your Cosmic Index subscription",
};

/**
 * Billing Settings Page
 *
 * Server component that:
 * 1. Checks authentication (redirects if not signed in)
 * 2. Fetches user tier from database
 * 3. Renders client component with tier info
 *
 * The middleware already protects /settings/*, but we do an explicit check
 * here to get the userId for database lookup.
 */
export default async function BillingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Fetch tier from database (source of truth)
  let tier: "free" | "pro" = "free";
  let hasStripeCustomer = false;

  const db = getUserDb();
  if (db) {
    const result = await db.execute({
      sql: "SELECT tier, stripe_customer_id FROM users WHERE id = ?",
      args: [userId],
    });

    if (result.rows.length > 0) {
      tier = (result.rows[0].tier as "free" | "pro") ?? "free";
      hasStripeCustomer = !!result.rows[0].stripe_customer_id;
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
