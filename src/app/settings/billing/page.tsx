import { Metadata } from "next";
import { Suspense } from "react";
import { getUserDb } from "@/lib/user-db";
import { BillingContent } from "./billing-content";
import { getAuthUser } from "@/lib/auth";
import { getProBillingEnabled, getWaitlistEnabled } from "@/lib/runtime-mode";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your Cosmic Index subscription",
};

// Authenticated settings page must render per-request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Billing Settings Page
 *
 * Server component that:
 * 1. Checks authentication (redirects if not signed in)
 * 2. Fetches user tier from database
 * 3. Renders client component with tier info
 */
export default async function BillingPage() {
  const user = await getAuthUser();
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-2xl tracking-wide mb-3">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your subscription.
        </p>
      </div>
    );
  }

  // Fetch tier from database (source of truth)
  let tier: "free" | "pro" = user.tier;
  let hasStripeCustomer = false;

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="font-display text-2xl tracking-wide mb-6">Billing</h1>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading billing controls...</p>}>
        <BillingContent
          tier={tier}
          hasStripeCustomer={hasStripeCustomer}
          proBillingEnabled={getProBillingEnabled()}
          waitlistEnabled={getWaitlistEnabled()}
        />
      </Suspense>
    </div>
  );
}
