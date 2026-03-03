import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireStripe, APP_URL } from "@/lib/stripe";
import { requireUserDb } from "@/lib/user-db";
import { getProBillingEnabled } from "@/lib/runtime-mode";

/**
 * POST /api/stripe/portal
 *
 * Create a Stripe Customer Portal session.
 * Allows Pro users to manage their subscription (update payment, cancel, etc.).
 *
 * Returns the portal URL for client-side redirect.
 */
export async function POST() {
  try {
    const user = await requireAuth();
    if (!getProBillingEnabled()) {
      return NextResponse.json(
        { error: "feature_disabled", feature: "billing" },
        { status: 403 }
      );
    }

    const stripe = requireStripe();
    const db = requireUserDb();

    // Get user's Stripe linkage from DB.
    const result = await db.execute({
      sql: "SELECT stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?",
      args: [user.userId],
    });

    const dbCustomerId = result.rows[0]?.stripe_customer_id as string | undefined;
    const dbSubscriptionId = result.rows[0]?.stripe_subscription_id as string | undefined;
    let customerId: string | undefined = dbCustomerId;

    // Fallback 1: resolve customer from known subscription ID.
    if (!customerId && dbSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(dbSubscriptionId);
        customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;
      } catch (error) {
        console.warn("Stripe portal: subscription lookup failed", error);
      }
    }

    // Fallback 2: resolve customer by account email and active-ish subscriptions.
    if (!customerId && user.email) {
      try {
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 5,
        });

        for (const candidate of customers.data) {
          if ("deleted" in candidate && candidate.deleted) continue;

          const subscriptions = await stripe.subscriptions.list({
            customer: candidate.id,
            status: "all",
            limit: 5,
          });

          const hasManageableSubscription = subscriptions.data.some(
            (subscription) =>
              subscription.status !== "canceled" &&
              subscription.status !== "incomplete_expired"
          );

          if (hasManageableSubscription) {
            customerId = candidate.id;
            break;
          }
        }
      } catch (error) {
        console.warn("Stripe portal: customer email lookup failed", error);
      }
    }

    // Persist recovered customer linkage for future requests.
    if (customerId && customerId !== dbCustomerId) {
      await db.execute({
        sql: `
          UPDATE users
          SET stripe_customer_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `,
        args: [customerId, user.userId],
      });
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return authErrorResponse(error);
  }
}
