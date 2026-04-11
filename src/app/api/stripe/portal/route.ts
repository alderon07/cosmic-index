import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireStripe, APP_URL } from "@/lib/stripe";
import { requireUserDb } from "@/lib/user-db";
import { getFeatureDisabledResponse, resolveProAccess } from "@/lib/pro-access";
import { requireSameOrigin } from "@/lib/request-origin";
import {
  getSubscriptionPriceDetails,
  isManageableStripeSubscriptionStatus,
  matchesConfiguredProPrice,
} from "@/lib/stripe-subscriptions";

/**
 * POST /api/stripe/portal
 *
 * Create a Stripe Customer Portal session.
 * Allows Pro users to manage their subscription (update payment, cancel, etc.).
 *
 * Returns the portal URL for client-side redirect.
 */
export async function POST(request: Request) {
  try {
    const sameOriginError = requireSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }

    const user = await requireAuth();
    if (!resolveProAccess(user).canManageBilling) {
      return getFeatureDisabledResponse("billing");
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

    const localSubscriptions = await db.execute({
      sql: `
        SELECT stripe_subscription_id, stripe_customer_id, status, current_period_end
        FROM stripe_subscriptions
        WHERE user_id = ?
          AND stripe_price_id = ?
          AND status IN ('active', 'trialing', 'past_due', 'unpaid', 'incomplete')
        ORDER BY
          CASE status
            WHEN 'active' THEN 0
            WHEN 'trialing' THEN 1
            WHEN 'past_due' THEN 2
            WHEN 'unpaid' THEN 3
            ELSE 4
          END,
          current_period_end DESC,
          stripe_subscription_id DESC
      `,
      args: [user.userId, process.env.STRIPE_PRO_PRICE_ID ?? ""],
    });

    const preferredLocalSubscription = localSubscriptions.rows.find((row) =>
      isManageableStripeSubscriptionStatus(row.status as string | undefined)
    );

    if (preferredLocalSubscription) {
      customerId = preferredLocalSubscription.stripe_customer_id as string;
    }

    // Fallback: resolve customer from known subscription ID, but only for the
    // configured Pro price so we do not recover arbitrary subscriptions.
    if (!customerId && dbSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(dbSubscriptionId);
        const { priceId } = getSubscriptionPriceDetails(subscription);
        if (
          matchesConfiguredProPrice(priceId) &&
          isManageableStripeSubscriptionStatus(subscription.status)
        ) {
          customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id;
        }
      } catch (error) {
        console.warn("Stripe portal: subscription lookup failed", error);
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
