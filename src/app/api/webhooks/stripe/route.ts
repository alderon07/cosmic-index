import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { getUserDb } from "@/lib/user-db";
import { Client } from "@libsql/client";

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler with signature verification and duplicate suppression.
 *
 * Flow:
 * 1. Verify webhook signature
 * 2. Check if event ID has already been recorded; skip if so
 * 3. Process event
 * 4. Record event ID for future duplicate suppression
 *
 * We record after successful processing so transient processing failures can be retried.
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

  // 2. Skip events already recorded as processed
  const existingEvent = await db.execute({
    sql: "SELECT id FROM stripe_events WHERE id = ? LIMIT 1",
    args: [event.id],
  });
  if (existingEvent.rows.length > 0) {
    console.log(`Stripe webhook: Skipping duplicate event ${event.id}`);
    return NextResponse.json({ received: true, skipped: "duplicate" });
  }

  // 3. Process event
  try {
    await processStripeEvent(event, db);
    console.log(`Stripe webhook: Processed event ${event.id} (${event.type})`);
  } catch (error) {
    console.error(`Stripe webhook processing error for ${event.id}:`, error);
    // Note: Event is recorded but processing failed
    // In production, you might want to add a "processed_at" column to track incomplete processing
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  // 4. Record event after successful processing to suppress future duplicates.
  try {
    await db.execute({
      sql: "INSERT INTO stripe_events (id, event_type) VALUES (?, ?)",
      args: [event.id, event.type],
    });
  } catch (error) {
    // Another in-flight delivery may have already recorded this event.
    if (String(error).includes("UNIQUE constraint") || String(error).includes("PRIMARY KEY")) {
      console.log(`Stripe webhook: Event already recorded ${event.id}`);
      return NextResponse.json({ received: true, skipped: "duplicate" });
    }

    // Event processing succeeded; do not fail the webhook response because
    // retries would re-run processing and can create unnecessary churn.
    console.error(`Stripe webhook: Processed event ${event.id} but failed to record idempotency marker`, error);
    return NextResponse.json({ received: true, warning: "event_record_not_persisted" });
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
