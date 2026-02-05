import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { getUserDb } from "@/lib/user-db";
import { Client } from "@libsql/client";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler with idempotent event processing.
 *
 * CRITICAL: Uses insert-as-lock pattern for idempotency.
 * 1. Verify webhook signature
 * 2. INSERT event ID into stripe_events table (atomic lock acquisition)
 * 3. If INSERT succeeds, we own the lock - process the event
 * 4. If INSERT fails (duplicate), event was already processed - skip
 *
 * This ensures that even if Stripe retries a webhook, we only process it once.
 */
export async function POST(request: NextRequest) {
  const stripe = requireStripe();
  const db = getUserDb();

  if (!db) {
    console.error("Stripe webhook: Database not configured");
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // Get the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // 1. Verify signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2. ATOMIC idempotency - insert-as-lock pattern
  // INSERT first; if it fails (duplicate), we already processed this event
  try {
    await db.execute({
      sql: "INSERT INTO stripe_events (id, event_type) VALUES (?, ?)",
      args: [event.id, event.type],
    });
  } catch (error) {
    // Constraint violation = duplicate event
    if (String(error).includes("UNIQUE constraint") || String(error).includes("PRIMARY KEY")) {
      console.log(`Stripe webhook: Skipping duplicate event ${event.id}`);
      return NextResponse.json({ received: true, skipped: "duplicate" });
    }
    // Re-throw other errors
    throw error;
  }

  // 3. Process event AFTER successful insert (we own the lock)
  try {
    await processStripeEvent(event, db);
    console.log(`Stripe webhook: Processed event ${event.id} (${event.type})`);
  } catch (error) {
    console.error(`Stripe webhook processing error for ${event.id}:`, error);
    // Note: Event is recorded but processing failed
    // In production, you might want to add a "processed_at" column to track incomplete processing
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Process a Stripe event and update user tier accordingly.
 */
async function processStripeEvent(event: Stripe.Event, db: Client) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;

      // Tier based on subscription STATUS, not event type
      // Active or trialing = Pro, everything else = free
      const tier = ["active", "trialing"].includes(status) ? "pro" : "free";

      // Resolve user by customer ID (more reliable) or metadata fallback
      const userId = await resolveUserId(
        subscription.customer as string,
        subscription.metadata?.userId,
        db
      );

      if (!userId) {
        console.error(
          `Stripe webhook: Could not resolve user for subscription ${subscription.id}`
        );
        return; // Don't throw - webhook should still return 200
      }

      await updateUserTier(userId, tier, subscription.id, db);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(
        subscription.customer as string,
        subscription.metadata?.userId,
        db
      );

      if (userId) {
        await updateUserTier(userId, "free", null, db);
      }
      break;
    }

    case "checkout.session.completed": {
      // Link stripe_customer_id to user (for future lookups)
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.metadata?.userId && session.customer) {
        await db.execute({
          sql: `
            UPDATE users
            SET stripe_customer_id = ?, updated_at = datetime('now')
            WHERE id = ?
          `,
          args: [session.customer as string, session.metadata.userId],
        });
        console.log(
          `Stripe webhook: Linked customer ${session.customer} to user ${session.metadata.userId}`
        );
      }
      break;
    }

    // Add more event types as needed
    default:
      console.log(`Stripe webhook: Unhandled event type ${event.type}`);
  }
}

/**
 * Resolve user ID from Stripe customer ID or metadata.
 * Tries customer ID first (more reliable), falls back to metadata.
 */
async function resolveUserId(
  customerId: string,
  metadataUserId: string | undefined,
  db: Client
): Promise<string | null> {
  // Try customer ID first (more reliable)
  const byCustomer = await db.execute({
    sql: "SELECT id FROM users WHERE stripe_customer_id = ?",
    args: [customerId],
  });

  if (byCustomer.rows.length > 0) {
    return byCustomer.rows[0].id as string;
  }

  // Fallback to metadata
  if (metadataUserId) {
    // Verify user exists
    const byMetadata = await db.execute({
      sql: "SELECT id FROM users WHERE id = ?",
      args: [metadataUserId],
    });

    if (byMetadata.rows.length > 0) {
      return metadataUserId;
    }
  }

  return null;
}

/**
 * Update a user's tier and subscription ID.
 */
async function updateUserTier(
  userId: string,
  tier: "free" | "pro",
  subscriptionId: string | null,
  db: Client
) {
  await db.execute({
    sql: `
      UPDATE users
      SET tier = ?, stripe_subscription_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `,
    args: [tier, subscriptionId, userId],
  });

  console.log(`Stripe webhook: Updated user ${userId} to tier ${tier}`);
}
