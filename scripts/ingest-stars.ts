/**
 * Star Ingestion Script
 *
 * Fetches host star data from NASA Exoplanet Archive TAP API and
 * inserts/updates into Turso database with checkpointing for resumability.
 *
 * Usage: bun run ingest:stars
 *
 * Environment variables:
 *   TURSO_DATABASE_URL - Turso database URL
 *   TURSO_AUTH_TOKEN   - Turso auth token
 */

// Load .env.local for standalone script execution
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, Client } from "@libsql/client";

const TAP_BASE_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";
const BATCH_SIZE = 2000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const TIMEOUT_MS = 30_000;

// Turso client
let db: Client | null = null;

function getDb(): Client {
  if (db) return db;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable not set");
  }

  db = createClient({ url, authToken });
  return db;
}

// Derive spectral class from spectral type
function deriveSpectralClass(specType: string | null): string {
  if (!specType) return "Unknown";
  const first = specType.trim().charAt(0).toUpperCase();
  return ["O", "B", "A", "F", "G", "K", "M"].includes(first) ? first : "Unknown";
}

// Create URL-safe slug from hostname
function createSlug(hostname: string): string {
  return encodeURIComponent(hostname.normalize("NFKC").trim());
}

// Build ADQL query with keyset pagination
function buildQuery(lastHostname: string | null): string {
  const hostnameCondition = lastHostname
    ? `AND hostname > '${lastHostname.replace(/'/g, "''")}'`
    : "";

  return `
    SELECT
      hostname,
      COUNT(DISTINCT pl_name) AS planet_count,
      MAX(sy_pnum) AS sy_pnum,
      MAX(sy_snum) AS sy_snum,
      MAX(st_spectype) AS st_spectype,
      MAX(st_teff) AS st_teff,
      MAX(st_mass) AS st_mass,
      MAX(st_rad) AS st_rad,
      MAX(st_lum) AS st_lum,
      MAX(st_met) AS st_met,
      MAX(st_age) AS st_age,
      MAX(sy_dist) AS sy_dist,
      MAX(sy_vmag) AS sy_vmag,
      MAX(sy_kmag) AS sy_kmag,
      MAX(ra) AS ra,
      MAX(dec) AS dec
    FROM ps
    WHERE default_flag=1
      AND hostname IS NOT NULL
      ${hostnameCondition}
    GROUP BY hostname
    ORDER BY hostname ASC
  `.trim();
}

// Execute TAP query with retry logic
async function executeTAPQuery(query: string): Promise<unknown[]> {
  const makeBody = () => {
    const body = new URLSearchParams({
      REQUEST: "doQuery",
      LANG: "ADQL",
      FORMAT: "json",
      QUERY: query,
      MAXREC: String(BATCH_SIZE),
    });
    return body;
  };

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(TAP_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "cosmic-index-ingestion/1.0",
        },
        body: makeBody(),
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        const err = new Error(`TAP error: ${response.status} - ${text.slice(0, 500)}`);
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          throw err;
        }
        throw err;
      }

      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        throw new Error(`Unexpected response shape: ${text.slice(0, 500)}`);
      }

      return data;
    } catch (err) {
      lastErr = err;
      const errObj = err as { name?: string; message?: string };
      const isAbort = errObj?.name === "AbortError";
      const shouldRetry = attempt < MAX_RETRIES && (isAbort || /fetch failed/i.test(errObj?.message ?? ""));

      if (!shouldRetry) throw err;

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      console.log(`  Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastErr;
}

// Raw star row from TAP API
interface TAPStarRow {
  hostname: string;
  planet_count: number;
  sy_pnum: number | null;
  sy_snum: number | null;
  st_spectype: string | null;
  st_teff: number | null;
  st_mass: number | null;
  st_rad: number | null;
  st_lum: number | null;
  st_met: number | null;
  st_age: number | null;
  sy_dist: number | null;
  sy_vmag: number | null;
  sy_kmag: number | null;
  ra: number | null;
  dec: number | null;
}

// Get checkpoint from database
async function getCheckpoint(): Promise<{ lastHostname: string | null; rowsIngested: number }> {
  const client = getDb();

  const result = await client.execute(
    "SELECT last_hostname, rows_ingested FROM ingestion_state WHERE id = 'stars'"
  );

  if (result.rows.length === 0) {
    return { lastHostname: null, rowsIngested: 0 };
  }

  const row = result.rows[0];
  return {
    lastHostname: row.last_hostname as string | null,
    rowsIngested: Number(row.rows_ingested) || 0,
  };
}

// Save checkpoint to database
async function saveCheckpoint(lastHostname: string, rowsIngested: number): Promise<void> {
  const client = getDb();

  await client.execute({
    sql: `INSERT OR REPLACE INTO ingestion_state (id, last_hostname, last_run_at, rows_ingested)
          VALUES ('stars', ?, datetime('now'), ?)`,
    args: [lastHostname, rowsIngested],
  });
}

// Upsert batch of stars
async function upsertStars(stars: TAPStarRow[]): Promise<void> {
  const client = getDb();
  const now = new Date().toISOString();

  // Use a transaction for batch insert
  const statements = stars.map((star) => ({
    sql: `INSERT OR REPLACE INTO stars (
            id, hostname, spectral_type, spectral_class,
            star_temp_k, star_mass_solar, star_radius_solar, star_luminosity_log,
            metallicity_feh, age_gyr, distance_parsecs, vmag, kmag,
            ra_deg, dec_deg, stars_in_system, planets_in_system, planet_count,
            updated_at_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      createSlug(star.hostname),
      star.hostname.trim(),
      star.st_spectype?.trim() || null,
      deriveSpectralClass(star.st_spectype),
      star.st_teff,
      star.st_mass,
      star.st_rad,
      star.st_lum,
      star.st_met,
      star.st_age,
      star.sy_dist,
      star.sy_vmag,
      star.sy_kmag,
      star.ra,
      star.dec,
      star.sy_snum,
      star.sy_pnum,
      star.planet_count,
      now,
    ],
  }));

  await client.batch(statements, "write");
}

// Main ingestion function
async function ingest(): Promise<void> {
  console.log("Starting star ingestion...\n");

  // Get checkpoint
  const checkpoint = await getCheckpoint();
  let lastHostname = checkpoint.lastHostname;
  let totalIngested = checkpoint.rowsIngested;

  if (lastHostname) {
    console.log(`Resuming from checkpoint: "${lastHostname}" (${totalIngested} rows previously ingested)`);
  } else {
    console.log("Starting fresh ingestion");
  }

  let batchNum = 0;

  while (true) {
    batchNum++;
    console.log(`\nBatch ${batchNum}:`);

    // Fetch batch from TAP API
    console.log("  Fetching from NASA TAP API...");
    const query = buildQuery(lastHostname);
    const rows = (await executeTAPQuery(query)) as TAPStarRow[];

    if (rows.length === 0) {
      console.log("  No more rows to process");
      break;
    }

    console.log(`  Received ${rows.length} stars`);

    // Upsert to Turso
    console.log("  Upserting to Turso...");
    await upsertStars(rows);

    // Update checkpoint
    lastHostname = rows[rows.length - 1].hostname;
    totalIngested += rows.length;

    await saveCheckpoint(lastHostname, totalIngested);
    console.log(`  Checkpoint saved: "${lastHostname}" (${totalIngested} total)`);

    // If we got less than batch size, we're done
    if (rows.length < BATCH_SIZE) {
      console.log("  Reached end of data");
      break;
    }
  }

  console.log(`\nIngestion complete!`);
  console.log(`Total stars ingested: ${totalIngested}`);
}

// Reset checkpoint (for fresh start)
async function resetCheckpoint(): Promise<void> {
  const client = getDb();
  await client.execute("DELETE FROM ingestion_state WHERE id = 'stars'");
  console.log("Checkpoint reset");
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--reset")) {
    await resetCheckpoint();
    return;
  }

  if (args.includes("--help")) {
    console.log(`
Star Ingestion Script

Usage:
  bun run ingest:stars          Run ingestion (resumes from checkpoint)
  bun run ingest:stars --reset  Reset checkpoint for fresh start
  bun run ingest:stars --help   Show this help

Environment variables:
  TURSO_DATABASE_URL  - Turso database URL (required)
  TURSO_AUTH_TOKEN    - Turso auth token (optional for local dev)
`);
    return;
  }

  await ingest();
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
