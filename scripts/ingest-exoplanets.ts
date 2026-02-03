/**
 * Exoplanet Ingestion Script
 *
 * Fetches exoplanet data from NASA Exoplanet Archive TAP API and
 * inserts/updates into Turso database with checkpointing for resumability.
 *
 * Usage:
 *   bun run ingest:exoplanets              # Run ingestion (resumes from checkpoint)
 *   bun run ingest:exoplanets --reset      # Reset checkpoint for fresh start
 *   bun run ingest:exoplanets --batch=500  # Custom batch size
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
const DEFAULT_BATCH_SIZE = 1000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const TIMEOUT_MS = 30_000;

// Parse command line args
function parseArgs(): { reset: boolean; help: boolean; batchSize: number } {
  const args = process.argv.slice(2);
  let batchSize = DEFAULT_BATCH_SIZE;

  for (const arg of args) {
    if (arg.startsWith("--batch=")) {
      const val = parseInt(arg.split("=")[1], 10);
      if (!isNaN(val) && val > 0 && val <= 5000) {
        batchSize = val;
      }
    }
  }

  return {
    reset: args.includes("--reset"),
    help: args.includes("--help"),
    batchSize,
  };
}

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

// Create URL-safe slug from planet name
function createSlug(plName: string): string {
  return encodeURIComponent(plName.normalize("NFKC").trim());
}

// Build ADQL query with stable keyset pagination (case-insensitive)
// Uses lowercase comparison to avoid lexicographic surprises
function buildQuery(lastPlNameLower: string | null): string {
  // Stable keyset: order by lower(pl_name), then pl_name for tie-breaking
  const cursorCondition = lastPlNameLower
    ? `AND (lower(pl_name) > '${lastPlNameLower.replace(/'/g, "''")}')`
    : "";

  return `
    SELECT
      pl_name,
      hostname,
      discoverymethod,
      disc_facility,
      disc_year,
      pl_orbper,
      pl_rade,
      pl_masse,
      pl_eqt,
      sy_dist,
      sy_snum,
      sy_pnum,
      st_spectype,
      st_teff,
      st_mass,
      st_rad,
      st_lum,
      ra,
      dec
    FROM ps
    WHERE default_flag=1
      AND pl_name IS NOT NULL
      ${cursorCondition}
    ORDER BY lower(pl_name) ASC, pl_name ASC
  `.trim();
}

// Execute TAP query with retry logic
async function executeTAPQuery(query: string, maxrec: number): Promise<unknown[]> {
  const makeBody = () => {
    const body = new URLSearchParams({
      REQUEST: "doQuery",
      LANG: "ADQL",
      FORMAT: "json",
      QUERY: query,
      MAXREC: String(maxrec),
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

// Raw exoplanet row from TAP API (matches NASA column names exactly)
interface TAPExoplanetRow {
  pl_name: string;
  hostname: string | null;
  discoverymethod: string | null;
  disc_facility: string | null;
  disc_year: number | null;
  pl_orbper: number | null;
  pl_rade: number | null;
  pl_masse: number | null;
  pl_eqt: number | null;
  sy_dist: number | null;
  sy_snum: number | null;
  sy_pnum: number | null;
  st_spectype: string | null;
  st_teff: number | null;
  st_mass: number | null;
  st_rad: number | null;
  st_lum: number | null;
  ra: number | null;
  dec: number | null;
}

// Get checkpoint from database
async function getCheckpoint(): Promise<{ lastPlNameLower: string | null; rowsIngested: number }> {
  const client = getDb();

  const result = await client.execute(
    "SELECT last_hostname, rows_ingested FROM ingestion_state WHERE id = 'exoplanets'"
  );

  if (result.rows.length === 0) {
    return { lastPlNameLower: null, rowsIngested: 0 };
  }

  const row = result.rows[0];
  return {
    lastPlNameLower: row.last_hostname as string | null, // reusing column name from stars
    rowsIngested: Number(row.rows_ingested) || 0,
  };
}

// Save checkpoint to database
async function saveCheckpoint(lastPlNameLower: string, rowsIngested: number): Promise<void> {
  const client = getDb();

  await client.execute({
    sql: `INSERT OR REPLACE INTO ingestion_state (id, last_hostname, last_run_at, rows_ingested)
          VALUES ('exoplanets', ?, datetime('now'), ?)`,
    args: [lastPlNameLower, rowsIngested],
  });
}

// Upsert batch of exoplanets using INSERT ... ON CONFLICT
async function upsertExoplanets(exoplanets: TAPExoplanetRow[]): Promise<void> {
  const client = getDb();
  const now = new Date().toISOString();

  // Build batch of upsert statements
  const statements = exoplanets.map((planet) => ({
    sql: `INSERT INTO exoplanets (
            id, pl_name, pl_name_lower, hostname,
            discovery_method, disc_facility, disc_year,
            orbital_period_days, radius_earth, mass_earth, equilibrium_temp_k,
            distance_parsecs, stars_in_system, planets_in_system,
            st_spectype, st_teff, st_mass, st_rad, st_lum,
            ra_deg, dec_deg,
            updated_at_index
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(pl_name) DO UPDATE SET
            id = excluded.id,
            pl_name_lower = excluded.pl_name_lower,
            hostname = excluded.hostname,
            discovery_method = excluded.discovery_method,
            disc_facility = excluded.disc_facility,
            disc_year = excluded.disc_year,
            orbital_period_days = excluded.orbital_period_days,
            radius_earth = excluded.radius_earth,
            mass_earth = excluded.mass_earth,
            equilibrium_temp_k = excluded.equilibrium_temp_k,
            distance_parsecs = excluded.distance_parsecs,
            stars_in_system = excluded.stars_in_system,
            planets_in_system = excluded.planets_in_system,
            st_spectype = excluded.st_spectype,
            st_teff = excluded.st_teff,
            st_mass = excluded.st_mass,
            st_rad = excluded.st_rad,
            st_lum = excluded.st_lum,
            ra_deg = excluded.ra_deg,
            dec_deg = excluded.dec_deg,
            updated_at_index = excluded.updated_at_index`,
    args: [
      createSlug(planet.pl_name),
      planet.pl_name.trim(),
      planet.pl_name.trim().toLowerCase(),
      planet.hostname?.trim() || "Unknown",
      planet.discoverymethod?.trim() || null,
      planet.disc_facility?.trim() || null,
      planet.disc_year,
      planet.pl_orbper,
      planet.pl_rade,
      planet.pl_masse,
      planet.pl_eqt,
      planet.sy_dist,
      planet.sy_snum,
      planet.sy_pnum,
      planet.st_spectype?.trim() || null,
      planet.st_teff,
      planet.st_mass,
      planet.st_rad,
      planet.st_lum,
      planet.ra,
      planet.dec,
      now,
    ],
  }));

  // Execute as a single transaction (batch with "write" mode)
  await client.batch(statements, "write");
}

// Rebuild FTS index from scratch (faster than incremental for full re-index)
async function rebuildFtsIndex(): Promise<void> {
  const client = getDb();
  console.log("\nRebuilding FTS index...");

  // Delete all FTS content and rebuild from main table
  await client.execute("DELETE FROM exoplanets_fts");
  await client.execute(`
    INSERT INTO exoplanets_fts(rowid, pl_name, hostname, discovery_method)
    SELECT rowid, pl_name, hostname, discovery_method FROM exoplanets
  `);

  console.log("FTS index rebuilt");
}

// Main ingestion function
async function ingest(batchSize: number): Promise<void> {
  console.log(`Starting exoplanet ingestion (batch size: ${batchSize})...\n`);

  // Get checkpoint
  const checkpoint = await getCheckpoint();
  let lastPlNameLower = checkpoint.lastPlNameLower;
  let totalIngested = checkpoint.rowsIngested;

  if (lastPlNameLower) {
    console.log(`Resuming from checkpoint: "${lastPlNameLower}" (${totalIngested} rows previously ingested)`);
  } else {
    console.log("Starting fresh ingestion");
  }

  let batchNum = 0;

  while (true) {
    batchNum++;
    console.log(`\nBatch ${batchNum}:`);

    // Fetch batch from TAP API
    console.log("  Fetching from NASA TAP API...");
    const query = buildQuery(lastPlNameLower);
    const rows = (await executeTAPQuery(query, batchSize)) as TAPExoplanetRow[];

    if (rows.length === 0) {
      console.log("  No more rows to process");
      break;
    }

    // Log first row keys on first batch (helps verify column names)
    if (batchNum === 1 && rows.length > 0) {
      console.log(`  First row keys: ${Object.keys(rows[0]).join(", ")}`);
    }

    console.log(`  Received ${rows.length} exoplanets`);

    // Upsert to Turso (wrapped in transaction via batch)
    console.log("  Upserting to Turso...");
    await upsertExoplanets(rows);

    // Update checkpoint using lowercase for stable cursor
    const lastRow = rows[rows.length - 1];
    lastPlNameLower = lastRow.pl_name.trim().toLowerCase();
    totalIngested += rows.length;

    await saveCheckpoint(lastPlNameLower, totalIngested);
    console.log(`  Checkpoint saved: "${lastPlNameLower}" (${totalIngested} total)`);

    // If we got less than batch size, we're done
    if (rows.length < batchSize) {
      console.log("  Reached end of data");
      break;
    }
  }

  // Rebuild FTS index after full ingestion
  await rebuildFtsIndex();

  console.log(`\nIngestion complete!`);
  console.log(`Total exoplanets ingested: ${totalIngested}`);
}

// Reset checkpoint (for fresh start)
async function resetCheckpoint(): Promise<void> {
  const client = getDb();
  await client.execute("DELETE FROM ingestion_state WHERE id = 'exoplanets'");
  console.log("Checkpoint reset");
}

// Main entry point
async function main(): Promise<void> {
  const { reset, help, batchSize } = parseArgs();

  if (help) {
    console.log(`
Exoplanet Ingestion Script

Usage:
  bun run ingest:exoplanets              Run ingestion (resumes from checkpoint)
  bun run ingest:exoplanets --reset      Reset checkpoint for fresh start
  bun run ingest:exoplanets --batch=N    Set batch size (default: ${DEFAULT_BATCH_SIZE}, max: 5000)
  bun run ingest:exoplanets --help       Show this help

Environment variables:
  TURSO_DATABASE_URL  - Turso database URL (required)
  TURSO_AUTH_TOKEN    - Turso auth token (optional for local dev)
`);
    return;
  }

  if (reset) {
    await resetCheckpoint();
    return;
  }

  await ingest(batchSize);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
