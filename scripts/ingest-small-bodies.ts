/**
 * Small Bodies Ingestion Script
 *
 * Fetches small body data from JPL SBDB Query API and inserts/updates
 * into Turso database with checkpointing for resumability.
 *
 * Usage:
 *   bun run ingest:small-bodies           # Run ingestion (resumes from checkpoint)
 *   bun run ingest:small-bodies --reset   # Reset checkpoint for fresh start
 *
 * Environment variables:
 *   TURSO_DATABASE_URL - Turso database URL
 *   TURSO_AUTH_TOKEN   - Turso auth token
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, Client } from "@libsql/client";

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const SBDB_QUERY_URL = "https://ssd-api.jpl.nasa.gov/sbdb_query.api";

// Fields we need from the API
const FIELDS = "spkid,full_name,kind,pdes,name,neo,pha,class,diameter,H";

// Adaptive batch configuration
const INITIAL_BATCH_SIZE = 10_000;
const MIN_BATCH_SIZE = 5_000;
const MAX_BATCH_SIZE = 25_000;

// Timing
const API_TIMEOUT_MS = 120_000; // 2 minutes for large batches
const FAST_RESPONSE_MS = 5_000; // Scale up if response faster than this
const SLOW_RESPONSE_MS = 15_000; // Scale down if response slower than this

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

// Database batch size (rows per transaction)
const DB_BATCH_SIZE = 2000;

// ═══════════════════════════════════════════════════════════════════════════════
// Database Connection
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Data Transformation (reusing logic from jpl-sbdb.ts)
// ═══════════════════════════════════════════════════════════════════════════════

type SmallBodyKind = "asteroid" | "comet";

// Parse body kind from JPL data
function parseBodyKind(
  kind: string | null | undefined,
  pdes?: string | null,
  fullName?: string | null
): SmallBodyKind {
  // Check explicit kind field first
  // JPL API returns: "cn" for comets, "an" for numbered asteroids, "au" for unnumbered asteroids
  if (kind) {
    const normalized = kind.toLowerCase();
    if (normalized.startsWith("c") || normalized.includes("comet")) {
      return "comet";
    }
    if (normalized.startsWith("a") || normalized.includes("asteroid")) {
      return "asteroid";
    }
  }

  // Infer from designation - comets have distinctive prefixes
  const designation = pdes || fullName || "";
  const cometPattern = /^(C\/|P\/|D\/|I\/|A\/|\d+P\/|\d+P\b)/i;
  if (cometPattern.test(designation.trim())) {
    return "comet";
  }

  return "asteroid";
}

// Extract display name from full name
function extractDisplayName(
  fullName: string | null,
  pdes: string | null,
  name: string | null
): string {
  // Prefer the actual name if available
  if (name && name.trim()) {
    return name.trim();
  }

  // Fall back to cleaned up full name
  if (fullName) {
    // For comets like "1P/Halley" or "C/2020 F3 (NEOWISE)", extract the name part
    const cometMatch = fullName.match(
      /^[\dA-Z]+[A-Z]?\/(?:\d{4}\s+[A-Z]\d+\s+)?(.+)$/i
    );
    if (cometMatch && cometMatch[1]) {
      return cometMatch[1].replace(/^\(|\)$/g, "").trim();
    }

    // For asteroids like "433 Eros" or "(433) Eros", extract the name
    const asteroidMatch = fullName.match(/^(?:\(?\d+\)?\s+)?([A-Za-z].*)$/);
    if (asteroidMatch && asteroidMatch[1]) {
      return asteroidMatch[1].replace(/\([^)]*\)/g, "").trim();
    }

    // Generic cleanup: remove leading numbers and parentheses
    const cleaned = fullName
      .replace(/^\d+\s+/, "")
      .replace(/\([^)]*\)/g, "")
      .trim();
    if (cleaned) return cleaned;
  }

  // Fall back to designation
  return pdes || "Unknown";
}

// Create URL-safe slug (matches types.ts createSlug)
function createSlug(name: string): string {
  const normalized = name.normalize("NFKC").trim();
  return encodeURIComponent(normalized);
}

// Create sortable name (lowercase, clean)
function createNameSort(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/^[(\d]+[)\s]*/g, "") // Remove leading numbers/parens
    .replace(/[^a-z0-9]/g, "") // Keep only alphanumeric
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Fetching
// ═══════════════════════════════════════════════════════════════════════════════

interface SBDBQueryResponse {
  signature: { source: string; version: string };
  count: string;
  fields: string[];
  data: (string | null)[][];
}

interface FetchResult {
  data: (string | null)[][];
  fields: string[];
  totalCount: number;
  durationMs: number;
}

async function fetchBatch(
  offset: number,
  limit: number,
  attempt: number = 1
): Promise<FetchResult> {
  const url = new URL(SBDB_QUERY_URL);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", limit.toString());
  if (offset > 0) {
    url.searchParams.set("limit-from", offset.toString());
  }

  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "cosmic-index-ingestion/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as SBDBQueryResponse;

    if (!Array.isArray(data.fields) || !Array.isArray(data.data)) {
      throw new Error("Invalid API response structure");
    }

    return {
      data: data.data,
      fields: data.fields,
      totalCount: parseInt(data.count, 10) || 0,
      durationMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("timed out"));
    const isRetryable =
      isTimeout ||
      (error instanceof Error &&
        (error.message.includes("5") || error.message.includes("fetch")));

    if (isRetryable && attempt <= MAX_RETRIES) {
      const delay =
        RETRY_DELAYS_MS[attempt - 1] + Math.floor(Math.random() * 500);
      console.log(
        `  ⚠ Retry ${attempt}/${MAX_RETRIES} after ${delay}ms (${isTimeout ? "timeout" : "error"})...`
      );
      await new Promise((r) => setTimeout(r, delay));
      return fetchBatch(offset, limit, attempt + 1);
    }

    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Database Operations
// ═══════════════════════════════════════════════════════════════════════════════

interface CheckpointState {
  lastOffset: number;
  rowsIngested: number;
  lastTotalObserved: number | null;
  lastError: string | null;
}

async function getCheckpoint(): Promise<CheckpointState> {
  const client = getDb();

  const result = await client.execute(
    "SELECT last_offset, rows_ingested, last_total_observed, last_error FROM ingest_state WHERE name = 'small_bodies'"
  );

  if (result.rows.length === 0) {
    return {
      lastOffset: 0,
      rowsIngested: 0,
      lastTotalObserved: null,
      lastError: null,
    };
  }

  const row = result.rows[0];
  return {
    lastOffset: Number(row.last_offset) || 0,
    rowsIngested: Number(row.rows_ingested) || 0,
    lastTotalObserved: row.last_total_observed
      ? Number(row.last_total_observed)
      : null,
    lastError: row.last_error as string | null,
  };
}

async function saveCheckpoint(
  lastOffset: number,
  rowsIngested: number,
  durationMs: number,
  totalObserved: number,
  lastError: string | null = null
): Promise<void> {
  const client = getDb();

  await client.execute({
    sql: `INSERT INTO ingest_state (name, last_offset, rows_ingested, last_batch_duration_ms, last_total_observed, last_error, updated_at)
          VALUES ('small_bodies', ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(name) DO UPDATE SET
            last_offset = excluded.last_offset,
            rows_ingested = excluded.rows_ingested,
            last_batch_duration_ms = excluded.last_batch_duration_ms,
            last_total_observed = excluded.last_total_observed,
            last_error = excluded.last_error,
            updated_at = excluded.updated_at`,
    args: [lastOffset, rowsIngested, durationMs, totalObserved, lastError],
  });
}

interface SmallBodyRow {
  spkid: string;
  id: string;
  designation: string;
  displayName: string;
  fullName: string | null;
  nameSort: string;
  bodyKind: SmallBodyKind;
  orbitClass: string | null;
  isNeo: boolean;
  isPha: boolean;
  diameterKm: number | null;
  absoluteMagnitude: number | null;
}

function transformRow(
  row: (string | null)[],
  fields: string[]
): SmallBodyRow | null {
  const getValue = (field: string): string | null => {
    const idx = fields.indexOf(field);
    return idx >= 0 ? row[idx] : null;
  };

  const spkid = getValue("spkid");
  const fullName = getValue("full_name");
  const pdes = getValue("pdes");
  const name = getValue("name");
  const kind = getValue("kind");

  // spkid is required for upsert
  if (!spkid) {
    return null;
  }

  const displayName = extractDisplayName(fullName, pdes, name);
  if (!displayName || displayName === "Unknown") {
    return null;
  }

  const designation = pdes || displayName;
  const bodyKind = parseBodyKind(kind, pdes, fullName);

  const diameterStr = getValue("diameter");
  const diameter = diameterStr ? parseFloat(diameterStr) : null;

  const hStr = getValue("H");
  const h = hStr ? parseFloat(hStr) : null;

  return {
    spkid,
    id: createSlug(designation),
    designation,
    displayName,
    fullName,
    nameSort: createNameSort(displayName),
    bodyKind,
    orbitClass: getValue("class"),
    isNeo: getValue("neo") === "Y",
    isPha: getValue("pha") === "Y",
    diameterKm: diameter && !isNaN(diameter) ? diameter : null,
    absoluteMagnitude: h && !isNaN(h) ? h : null,
  };
}

interface UpsertStats {
  inserted: number;
  updated: number;
  skipped: number;
  designationCollisions: number;
}

async function upsertBatch(rows: SmallBodyRow[]): Promise<UpsertStats> {
  const client = getDb();
  const now = new Date().toISOString();
  const stats: UpsertStats = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    designationCollisions: 0,
  };

  // Process in smaller chunks for transaction efficiency
  for (let i = 0; i < rows.length; i += DB_BATCH_SIZE) {
    const chunk = rows.slice(i, i + DB_BATCH_SIZE);

    const statements = chunk.map((row) => ({
      sql: `INSERT INTO small_bodies (
              spkid, id, designation, display_name, full_name, name_sort,
              body_kind, orbit_class, is_neo, is_pha, diameter_km, absolute_magnitude,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(spkid) DO UPDATE SET
              id = excluded.id,
              designation = excluded.designation,
              display_name = excluded.display_name,
              full_name = excluded.full_name,
              name_sort = excluded.name_sort,
              body_kind = excluded.body_kind,
              orbit_class = excluded.orbit_class,
              is_neo = excluded.is_neo,
              is_pha = excluded.is_pha,
              diameter_km = excluded.diameter_km,
              absolute_magnitude = excluded.absolute_magnitude,
              updated_at = excluded.updated_at`,
      args: [
        row.spkid,
        row.id,
        row.designation,
        row.displayName,
        row.fullName,
        row.nameSort,
        row.bodyKind,
        row.orbitClass,
        row.isNeo ? 1 : 0,
        row.isPha ? 1 : 0,
        row.diameterKm,
        row.absoluteMagnitude,
        now,
      ],
    }));

    try {
      const results = await client.batch(statements, "write");
      // Count successful operations
      for (const result of results) {
        if (result.rowsAffected > 0) {
          stats.inserted++;
        }
      }
    } catch (error) {
      // Handle designation collisions gracefully
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        if (error.message.includes("uq_sb_designation_nocase")) {
          console.warn(
            `  ⚠ Designation collision in batch, falling back to individual inserts...`
          );
          // Fall back to individual inserts to identify the problematic rows
          for (const row of chunk) {
            try {
              await client.execute({
                sql: `INSERT INTO small_bodies (
                        spkid, id, designation, display_name, full_name, name_sort,
                        body_kind, orbit_class, is_neo, is_pha, diameter_km, absolute_magnitude,
                        updated_at
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                      ON CONFLICT(spkid) DO UPDATE SET
                        id = excluded.id,
                        designation = excluded.designation,
                        display_name = excluded.display_name,
                        full_name = excluded.full_name,
                        name_sort = excluded.name_sort,
                        body_kind = excluded.body_kind,
                        orbit_class = excluded.orbit_class,
                        is_neo = excluded.is_neo,
                        is_pha = excluded.is_pha,
                        diameter_km = excluded.diameter_km,
                        absolute_magnitude = excluded.absolute_magnitude,
                        updated_at = excluded.updated_at`,
                args: [
                  row.spkid,
                  row.id,
                  row.designation,
                  row.displayName,
                  row.fullName,
                  row.nameSort,
                  row.bodyKind,
                  row.orbitClass,
                  row.isNeo ? 1 : 0,
                  row.isPha ? 1 : 0,
                  row.diameterKm,
                  row.absoluteMagnitude,
                  now,
                ],
              });
              stats.inserted++;
            } catch (innerError) {
              if (
                innerError instanceof Error &&
                innerError.message.includes("uq_sb_designation_nocase")
              ) {
                console.error(
                  `  ⚠ [UNEXPECTED] Designation collision: spkid=${row.spkid}, designation="${row.designation}" — skipping`
                );
                stats.designationCollisions++;
              } else {
                throw innerError;
              }
            }
          }
          continue;
        }
      }
      throw error;
    }
  }

  return stats;
}

async function checkFTSIntegrity(): Promise<number> {
  const client = getDb();

  // Check for rows missing from FTS using JOIN
  const result = await client.execute(`
    SELECT COUNT(*) as missing
    FROM small_bodies b
    LEFT JOIN small_bodies_fts f ON f.rowid = b.rowid
    WHERE f.rowid IS NULL
  `);

  return Number(result.rows[0]?.missing) || 0;
}

async function rebuildFTS(): Promise<void> {
  const client = getDb();
  console.log("  Rebuilding FTS index...");
  await client.execute(
    "INSERT INTO small_bodies_fts(small_bodies_fts) VALUES('rebuild')"
  );
  console.log("  FTS index rebuilt.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Ingestion Logic
// ═══════════════════════════════════════════════════════════════════════════════

async function ingest(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Small Bodies Ingestion");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Get checkpoint
  const checkpoint = await getCheckpoint();
  let offset = checkpoint.lastOffset;
  let totalIngested = checkpoint.rowsIngested;
  let batchSize = INITIAL_BATCH_SIZE;

  if (offset > 0) {
    console.log(
      `Resuming from checkpoint: offset=${offset.toLocaleString()}, ${totalIngested.toLocaleString()} rows previously ingested`
    );
    if (checkpoint.lastTotalObserved) {
      const remaining = checkpoint.lastTotalObserved - offset;
      console.log(
        `  Estimated remaining: ~${remaining.toLocaleString()} rows`
      );
    }
    if (checkpoint.lastError) {
      console.log(`  Last error: ${checkpoint.lastError}`);
    }
  } else {
    console.log("Starting fresh ingestion");
  }

  let batchNum = 0;
  let totalApiTime = 0;
  let totalDbTime = 0;

  while (true) {
    batchNum++;
    console.log(`\n─── Batch ${batchNum} ───`);
    console.log(`  Offset: ${offset.toLocaleString()}, Batch size: ${batchSize.toLocaleString()}`);

    // Fetch from JPL API
    console.log("  Fetching from JPL SBDB API...");
    let result: FetchResult;
    try {
      result = await fetchBatch(offset, batchSize);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`  ✗ API fetch failed: ${errorMsg}`);
      await saveCheckpoint(
        offset,
        totalIngested,
        0,
        checkpoint.lastTotalObserved || 0,
        errorMsg
      );
      throw error;
    }

    totalApiTime += result.durationMs;

    console.log(
      `  Received ${result.data.length.toLocaleString()} rows in ${(result.durationMs / 1000).toFixed(1)}s`
    );
    console.log(
      `  Total available: ${result.totalCount.toLocaleString()} objects`
    );

    if (result.data.length === 0) {
      console.log("  No more rows to process");
      break;
    }

    // Transform rows
    const transformed = result.data
      .map((row) => transformRow(row, result.fields))
      .filter((row): row is SmallBodyRow => row !== null);

    const skipped = result.data.length - transformed.length;
    if (skipped > 0) {
      console.log(`  Skipped ${skipped} invalid rows`);
    }

    // Upsert to database
    console.log(`  Upserting ${transformed.length.toLocaleString()} rows to Turso...`);
    const dbStart = Date.now();
    const stats = await upsertBatch(transformed);
    const dbDuration = Date.now() - dbStart;
    totalDbTime += dbDuration;

    console.log(`  Database: ${(dbDuration / 1000).toFixed(1)}s`);
    if (stats.designationCollisions > 0) {
      console.log(
        `  ⚠ Designation collisions: ${stats.designationCollisions}`
      );
    }

    // Update progress
    offset += result.data.length;
    totalIngested += transformed.length;

    // Save checkpoint AFTER successful commit
    await saveCheckpoint(
      offset,
      totalIngested,
      result.durationMs,
      result.totalCount
    );
    console.log(
      `  Progress: ${totalIngested.toLocaleString()} / ${result.totalCount.toLocaleString()} (${((offset / result.totalCount) * 100).toFixed(1)}%)`
    );

    // Check if we've fetched everything (before adjusting batch size!)
    // We're done if we got fewer rows than requested OR we've reached the total
    const requestedBatchSize = batchSize; // Save before adapting
    if (result.data.length < requestedBatchSize || offset >= result.totalCount) {
      console.log("  Reached end of data");
      break;
    }

    // Adaptive batch sizing (only after checking completion)
    if (result.durationMs < FAST_RESPONSE_MS && batchSize < MAX_BATCH_SIZE) {
      batchSize = Math.min(Math.floor(batchSize * 1.5), MAX_BATCH_SIZE);
      console.log(`  ↑ Increasing batch size to ${batchSize.toLocaleString()}`);
    } else if (result.durationMs > SLOW_RESPONSE_MS && batchSize > MIN_BATCH_SIZE) {
      batchSize = Math.max(Math.floor(batchSize / 2), MIN_BATCH_SIZE);
      console.log(`  ↓ Decreasing batch size to ${batchSize.toLocaleString()}`);
    }
  }

  // Check FTS integrity
  console.log("\nChecking FTS integrity...");
  const missing = await checkFTSIntegrity();
  if (missing > 0) {
    console.warn(`  ⚠ FTS missing ${missing} rows, rebuilding...`);
    await rebuildFTS();
  } else {
    console.log("  FTS integrity OK");
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Ingestion Complete!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total rows ingested: ${totalIngested.toLocaleString()}`);
  console.log(`  Total API time: ${(totalApiTime / 1000).toFixed(1)}s`);
  console.log(`  Total DB time: ${(totalDbTime / 1000).toFixed(1)}s`);
  console.log(`  Total elapsed: ${((totalApiTime + totalDbTime) / 1000 / 60).toFixed(1)} minutes`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Entry Points
// ═══════════════════════════════════════════════════════════════════════════════

async function resetCheckpoint(): Promise<void> {
  const client = getDb();
  await client.execute("DELETE FROM ingest_state WHERE name = 'small_bodies'");
  console.log("Checkpoint reset for small_bodies");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help")) {
    console.log(`
Small Bodies Ingestion Script

Usage:
  bun run ingest:small-bodies           Run ingestion (resumes from checkpoint)
  bun run ingest:small-bodies --reset   Reset checkpoint for fresh start
  bun run ingest:small-bodies --help    Show this help

Environment variables:
  TURSO_DATABASE_URL  - Turso database URL (required)
  TURSO_AUTH_TOKEN    - Turso auth token (optional for local dev)
`);
    return;
  }

  if (args.includes("--reset")) {
    await resetCheckpoint();
    return;
  }

  await ingest();
}

main().catch((err) => {
  console.error("\n✗ Ingestion failed:", err);
  process.exit(1);
});
