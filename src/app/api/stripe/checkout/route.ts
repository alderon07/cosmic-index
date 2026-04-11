import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireStripe, STRIPE_PRICES, APP_URL } from "@/lib/stripe";
import { getUserDb } from "@/lib/user-db";
import { getFeatureDisabledResponse, resolveProAccess } from "@/lib/pro-access";
import { requireSameOrigin } from "@/lib/request-origin";

function buildCheckoutIdempotencyKey(userId: string): string {
  // Coalesce rapid retries/double-clicks into one Checkout Session while
  // still allowing users to start a fresh session shortly after.
  const windowBucket = Math.floor(Date.now() / 30_000);
  return `checkout:${userId}:${windowBucket}`;
}

/**
 * POST /api/stripe/checkout
 *
 * Create a Stripe Checkout session for Pro subscription.
 * Returns the checkout URL for client-side redirect.
 *
 * The checkout session includes:
 * - User ID in metadata (for webhook user resolution)
 * - Success/cancel URLs
 * - Customer email pre-fill
 */
export async function POST(request: Request) {
  try {
    const sameOriginError = requireSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }

    const user = await requireAuth();
    if (!resolveProAccess(user).canStartCheckout) {
      return getFeatureDisabledResponse("billing");
    }

    const stripe = requireStripe();
    const db = getUserDb();
    const idempotencyKey = buildCheckoutIdempotencyKey(user.userId);

    if (!STRIPE_PRICES.PRO_MONTHLY) {
      return NextResponse.json(
        { error: "Pro subscription not configured" },
        { status: 500 }
      );
    }

    // Check if user already has a Stripe customer ID
    let customerId: string | undefined;
    if (db) {
      const result = await db.execute({
        sql: "SELECT stripe_customer_id FROM users WHERE id = ?",
        args: [user.userId],
      });
      customerId = result.rows[0]?.stripe_customer_id as string | undefined;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: STRIPE_PRICES.PRO_MONTHLY,
          quantity: 1,
        },
      ],
      // Link to existing customer or create new one
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      // Store user ID for webhook resolution
      metadata: {
        userId: user.userId,
      },
      subscription_data: {
        metadata: {
          userId: user.userId,
        },
      },
      success_url: `${APP_URL}/settings/billing?success=true`,
      cancel_url: `${APP_URL}/settings/billing?canceled=true`,
      // Allow promotion codes
      allow_promotion_codes: true,
    }, {
      idempotencyKey,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return authErrorResponse(error);
  }
}
