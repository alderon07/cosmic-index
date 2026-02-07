import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireStripe, STRIPE_PRICES, APP_URL } from "@/lib/stripe";
import { getUserDb } from "@/lib/user-db";
import { isMockStripeEnabled, isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { setMockUserTier, setMockStripeCustomer } from "@/lib/mock-user-store";

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
export async function POST() {
  try {
    const user = await requireAuth();

    if (isMockStripeEnabled()) {
      if (isMockUserStoreEnabled()) {
        setMockUserTier(user.userId, "pro");
        setMockStripeCustomer(user.userId, "cus_mock_pro");
      }
      return NextResponse.json({
        url: `${APP_URL}/settings/billing?success=true&mock=1`,
      });
    }

    const stripe = requireStripe();
    const db = getUserDb();

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
      payment_method_types: ["card"],
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
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return authErrorResponse(error);
  }
}
