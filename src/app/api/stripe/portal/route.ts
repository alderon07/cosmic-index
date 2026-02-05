import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { requireStripe, APP_URL } from "@/lib/stripe";
import { requireUserDb } from "@/lib/user-db";

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
    const stripe = requireStripe();
    const db = requireUserDb();

    // Get user's Stripe customer ID
    const result = await db.execute({
      sql: "SELECT stripe_customer_id FROM users WHERE id = ?",
      args: [user.userId],
    });

    const customerId = result.rows[0]?.stripe_customer_id as string | undefined;

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
