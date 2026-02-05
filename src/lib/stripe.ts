import Stripe from "stripe";

/**
 * Stripe Client
 *
 * Lazy singleton for Stripe API client.
 * Returns null if Stripe is not configured (useful for local development).
 */

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.warn("Stripe not configured - Pro features disabled");
    return null;
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2025-01-27.acacia",
    typescript: true,
  });

  return stripeClient;
}

/**
 * Get Stripe client, throwing if not configured.
 * Use this in contexts where Stripe is required.
 */
export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe not configured");
  }
  return stripe;
}

/**
 * Stripe price IDs from environment.
 */
export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID,
} as const;

/**
 * App URL for Stripe redirects.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
