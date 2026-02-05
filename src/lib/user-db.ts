import { createClient, Client } from "@libsql/client";

/**
 * User Database Client
 *
 * Lazy singleton pattern for Turso connection, following the same pattern
 * as star-index.ts. This module provides database access for Pro tier features:
 * - User records (synced from Clerk)
 * - Saved objects
 * - Collections
 * - Saved searches
 * - Alerts
 * - Stripe events (idempotency)
 *
 * Uses the same Turso database as stars/exoplanets - tables coexist.
 */

// Lazy singleton for Turso client
let client: Client | null = null;

/**
 * Get or create the Turso database client.
 * Returns null if database is not configured.
 */
export function getUserDb(): Client | null {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.warn("Turso database not configured - Pro features disabled");
    return null;
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

/**
 * Get the database client, throwing if not configured.
 * Use this in contexts where the database is required (e.g., API routes).
 */
export function requireUserDb(): Client {
  const db = getUserDb();
  if (!db) {
    throw new Error("Database not configured");
  }
  return db;
}
