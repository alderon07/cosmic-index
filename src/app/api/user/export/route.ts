import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";

import { requireAuth, authErrorResponse } from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { listSavedObjects } from "@/lib/mock-user-store";
import { searchExoplanets } from "@/lib/exoplanet-index";
import { searchStars } from "@/lib/star-index";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import {
  ExoplanetQuerySchema,
  SmallBodyQuerySchema,
  StarQuerySchema,
  type ExoplanetQueryParams,
  type SmallBodyQueryParams,
  type StarQueryParams,
} from "@/lib/types";
import {
  computeFilterHash,
  decodeExportCursor,
  encodeExportCursor,
  generateExportFilename,
  type ExportCursor,
} from "@/lib/export-utils";
import { getTierLimits } from "@/lib/tier-limits";
import { resolveLimitMode, toLimitPolicyMetadata } from "@/lib/feature-policy";
import { recordLimitHitWithDedup } from "@/lib/waitlist";

/**
 * POST /api/user/export
 *
 * Export cosmic objects data as CSV or NDJSON.
 */

const EXPORT_CHUNK_SIZE = 1000;
const EXPORT_TIMEOUT_MS = 45_000;
const CURSOR_EXPIRY_MS = 24 * 60 * 60 * 1000;
const WINDOW_SECONDS = 60 * 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;

const ExportSchema = z.object({
  format: z.enum(["csv", "ndjson"]),
  category: z.enum(["exoplanets", "stars", "small-bodies", "saved-objects"]),
  queryParams: z.record(z.string(), z.unknown()).optional(),
  cursor: z.string().optional(),
});

const CSV_FIELDS: Record<string, { key: string; header: string }[]> = {
  exoplanets: [
    { key: "pl_name", header: "Planet Name" },
    { key: "hostname", header: "Host Star" },
    { key: "discovery_method", header: "Discovery Method" },
    { key: "disc_year", header: "Discovery Year" },
    { key: "orbital_period_days", header: "Orbital Period (days)" },
    { key: "radius_earth", header: "Radius (Earth)" },
    { key: "mass_earth", header: "Mass (Earth)" },
    { key: "equilibrium_temp_k", header: "Equilibrium Temp (K)" },
    { key: "distance_parsecs", header: "Distance (pc)" },
  ],
  stars: [
    { key: "hostname", header: "Star Name" },
    { key: "spectral_class", header: "Spectral Class" },
    { key: "spectral_type", header: "Spectral Type" },
    { key: "star_temp_k", header: "Temperature (K)" },
    { key: "star_mass_solar", header: "Mass (Solar)" },
    { key: "star_radius_solar", header: "Radius (Solar)" },
    { key: "distance_parsecs", header: "Distance (pc)" },
    { key: "planet_count", header: "Planet Count" },
    { key: "vmag", header: "V Magnitude" },
  ],
  "small-bodies": [
    { key: "display_name", header: "Name" },
    { key: "kind", header: "Type" },
    { key: "orbit_class", header: "Orbit Class" },
    { key: "neo", header: "Near-Earth Object" },
    { key: "pha", header: "Potentially Hazardous" },
    { key: "diameter_km", header: "Diameter (km)" },
    { key: "absolute_magnitude", header: "Absolute Magnitude (H)" },
  ],
  "saved-objects": [
    { key: "canonical_id", header: "Object ID" },
    { key: "display_name", header: "Name" },
    { key: "notes", header: "Notes" },
    { key: "created_at", header: "Saved At" },
  ],
};

const EXPORTABLE_FILTERS: Record<string, string[]> = {
  exoplanets: [
    "query",
    "discoveryMethod",
    "year",
    "hasRadius",
    "hasMass",
    "sizeCategory",
    "habitable",
    "facility",
    "multiPlanet",
    "maxDistancePc",
    "sort",
    "order",
  ],
  stars: [
    "query",
    "spectralClass",
    "minPlanets",
    "multiPlanet",
    "maxDistancePc",
    "sort",
    "order",
  ],
  "small-bodies": ["query", "kind", "neo", "pha", "orbitClass"],
};

const mockExportUsage = new Map<string, { requestTimestamps: number[]; rowEvents: Array<{ at: number; rows: number }> }>();

function getCSVHeader(category: string): string {
  const fields = CSV_FIELDS[category] || CSV_FIELDS["saved-objects"];
  return fields.map((f) => f.header).join(",");
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVRow(row: Record<string, unknown>, category: string): string {
  const fields = CSV_FIELDS[category] || CSV_FIELDS["saved-objects"];
  return fields.map((f) => escapeCSV(row[f.key])).join(",");
}

function pickExportableFilters(
  category: "exoplanets" | "stars" | "small-bodies",
  rawParams: Record<string, unknown>,
  parsedParams: Record<string, unknown>
): Record<string, unknown> {
  const allowlist = EXPORTABLE_FILTERS[category] ?? [];
  const filters: Record<string, unknown> = {};
  for (const key of allowlist) {
    if (Object.prototype.hasOwnProperty.call(rawParams, key)) {
      filters[key] = parsedParams[key];
    }
  }
  return filters;
}

function getLimitFromRaw(rawParams: Record<string, unknown>, parsedParams: Record<string, unknown>): number | undefined {
  if (!Object.prototype.hasOwnProperty.call(rawParams, "limit")) return undefined;
  const raw = parsedParams.limit;
  if (typeof raw !== "number" || Number.isNaN(raw)) return undefined;
  return Math.max(1, Math.floor(raw));
}

function getExportRateHeaders(params: {
  requestLimit: number;
  requestRemaining: number;
  rowLimit: number;
  rowRemaining: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Export-Requests-Limit": params.requestLimit.toString(),
    "X-RateLimit-Export-Requests-Remaining": Math.max(0, params.requestRemaining).toString(),
    "X-RateLimit-Export-Rows-Limit": params.rowLimit.toString(),
    "X-RateLimit-Export-Rows-Remaining": Math.max(0, params.rowRemaining).toString(),
  };
}

function getLimitPolicyHeaders(params: {
  configuredMode: "shadow" | "warn" | "enforce";
  effectiveMode: "shadow" | "warn" | "enforce";
  wouldBlock: boolean;
  waitlistEnabled: boolean;
  upgradePreviewAvailable: boolean;
}): Record<string, string> {
  return {
    "X-Limit-Policy-Configured-Mode": params.configuredMode,
    "X-Limit-Policy-Effective-Mode": params.effectiveMode,
    "X-Limit-Policy-Would-Block": params.wouldBlock ? "1" : "0",
    "X-Limit-Policy-Waitlist-Enabled": params.waitlistEnabled ? "1" : "0",
    "X-Limit-Policy-Upgrade-Preview": params.upgradePreviewAvailable ? "1" : "0",
  };
}

function getMockUsage(userId: string, now: number) {
  const usage = mockExportUsage.get(userId) ?? { requestTimestamps: [], rowEvents: [] };
  usage.requestTimestamps = usage.requestTimestamps.filter((ts) => ts > now - WINDOW_MS);
  usage.rowEvents = usage.rowEvents.filter((event) => event.at > now - WINDOW_MS);
  mockExportUsage.set(userId, usage);
  const requestCount = usage.requestTimestamps.length;
  const rowsUsed = usage.rowEvents.reduce((sum, event) => sum + event.rows, 0);
  return { usage, requestCount, rowsUsed };
}

async function getDbUsage(userId: string, now: number) {
  const db = getUserDb();
  if (!db) return null;

  const startedAfter = now - WINDOW_MS;
  const requestResult = await db.execute({
    sql: `
      SELECT COUNT(*) as request_count
      FROM export_history
      WHERE user_id = ? AND started_at >= ?
    `,
    args: [userId, startedAfter],
  });
  const requestCount = Number(requestResult.rows[0]?.request_count ?? 0);

  const rowResult = await db.execute({
    sql: `
      SELECT COALESCE(SUM(exported_count), 0) as rows_used
      FROM export_history
      WHERE user_id = ?
        AND started_at >= ?
        AND status IN ('complete', 'partial_budget', 'partial_timeout')
    `,
    args: [userId, startedAfter],
  });
  const rowsUsed = Number(rowResult.rows[0]?.rows_used ?? 0);

  return { requestCount, rowsUsed };
}

async function enforceExportLimits(params: {
  userId: string;
  requestLimit: number;
  rowLimit: number;
  estimatedRows: number;
  useMockStore: boolean;
}) {
  const now = Date.now();

  if (!params.useMockStore) {
    const dbUsage = await getDbUsage(params.userId, now);
    if (!dbUsage) {
      throw new Error("LIMIT_BACKEND_UNAVAILABLE");
    }

    const requestRemaining = params.requestLimit - dbUsage.requestCount - 1;
    const rowRemaining = params.rowLimit - dbUsage.rowsUsed - params.estimatedRows;

    if (requestRemaining < 0 || rowRemaining < 0) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    return {
      requestRemaining,
      rowRemaining,
    };
  }

  const { usage, requestCount, rowsUsed } = getMockUsage(params.userId, now);
  const requestRemaining = params.requestLimit - requestCount - 1;
  const rowRemaining = params.rowLimit - rowsUsed - params.estimatedRows;

  if (requestRemaining < 0 || rowRemaining < 0) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  usage.requestTimestamps.push(now);
  usage.rowEvents.push({ at: now, rows: params.estimatedRows });

  return {
    requestRemaining,
    rowRemaining,
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const baseHeaders = { "X-Request-Id": requestId };

  try {
    const user = await requireAuth();
    const tierLimits = getTierLimits(user.tier);
    const useMockStore = isMockUserStoreEnabled();
    const userDb = useMockStore ? null : getUserDb();
    const limitMode = await resolveLimitMode({ db: userDb });
    const withLimitPolicy = (wouldBlock: boolean) =>
      toLimitPolicyMetadata(limitMode, wouldBlock);

    const body = await request.json();
    const parseResult = ExportSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten(),
          limitPolicy: withLimitPolicy(false),
        },
        {
          status: 400,
          headers: {
            ...baseHeaders,
            ...getLimitPolicyHeaders(withLimitPolicy(false)),
          },
        }
      );
    }

    const { format, category, queryParams = {}, cursor } = parseResult.data;

    if (format === "csv") {
      const hasLimit = Object.prototype.hasOwnProperty.call(queryParams, "limit");
      const rawLimit = queryParams.limit;
      const limitValue =
        typeof rawLimit === "number"
          ? rawLimit
          : typeof rawLimit === "string"
          ? Number(rawLimit)
          : undefined;
      if (
        hasLimit &&
        (limitValue === undefined ||
          Number.isNaN(limitValue) ||
          limitValue < 1 ||
          limitValue > tierLimits.CSV_MAX_ROWS)
      ) {
        return Response.json(
          {
            error: "csv_row_limit_exceeded",
            message: `CSV exports support 1-${tierLimits.CSV_MAX_ROWS} rows. Use format=ndjson for larger exports.`,
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
    }

    let filters: Record<string, unknown> = {};
    let userLimit: number | undefined;

    if (category === "exoplanets") {
      const result = ExoplanetQuerySchema.safeParse(queryParams);
      if (!result.success) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "Invalid filters",
            details: result.error.flatten(),
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      filters = pickExportableFilters("exoplanets", queryParams, result.data as Record<string, unknown>);
      userLimit = getLimitFromRaw(queryParams, result.data as Record<string, unknown>);
    } else if (category === "stars") {
      const result = StarQuerySchema.safeParse(queryParams);
      if (!result.success) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "Invalid filters",
            details: result.error.flatten(),
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      filters = pickExportableFilters("stars", queryParams, result.data as Record<string, unknown>);
      userLimit = getLimitFromRaw(queryParams, result.data as Record<string, unknown>);
    } else if (category === "small-bodies") {
      const result = SmallBodyQuerySchema.safeParse(queryParams);
      if (!result.success) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "Invalid filters",
            details: result.error.flatten(),
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      filters = pickExportableFilters("small-bodies", queryParams, result.data as Record<string, unknown>);
      userLimit = getLimitFromRaw(queryParams, result.data as Record<string, unknown>);
    } else if (category === "saved-objects") {
      const rawLimit = queryParams.limit;
      const limitValue =
        typeof rawLimit === "number"
          ? rawLimit
          : typeof rawLimit === "string"
          ? Number(rawLimit)
          : undefined;
      if (limitValue !== undefined && !Number.isNaN(limitValue)) {
        userLimit = Math.max(1, Math.floor(limitValue));
      }
    }

    if ((category === "saved-objects" || category === "small-bodies") && cursor) {
      return Response.json(
        {
          error: "resume_not_supported",
          message: `Resume not supported for ${category}.`,
          limitPolicy: withLimitPolicy(false),
        },
        {
          status: 400,
          headers: {
            ...baseHeaders,
            ...getLimitPolicyHeaders(withLimitPolicy(false)),
          },
        }
      );
    }

    const filterHash = computeFilterHash(filters);
    let resumeCursor: ExportCursor | null = null;

    if (cursor) {
      resumeCursor = decodeExportCursor(cursor);
      if (!resumeCursor) {
        return Response.json(
          {
            error: "invalid_cursor_format",
            message: "Invalid cursor format.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      if (resumeCursor.expiresAt <= Date.now()) {
        return Response.json(
          {
            error: "cursor_expired",
            message: "Cursor expired, start a new export.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      if (resumeCursor.category !== category) {
        return Response.json(
          {
            error: "cursor_category_mismatch",
            message: "Cursor category mismatch.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      if (resumeCursor.filterHash !== filterHash) {
        return Response.json(
          {
            error: "cursor_filter_mismatch",
            message: "Cursor filters do not match request.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
    }

    const requestedMaxRows = Math.min(userLimit ?? tierLimits.MAX_EXPORT_ROWS, tierLimits.MAX_EXPORT_ROWS);
    const maxRows = format === "csv"
      ? Math.min(requestedMaxRows, tierLimits.CSV_MAX_ROWS)
      : requestedMaxRows;
    const estimatedRows = maxRows;

    let rateLimitHeaders: Record<string, string> = {};
    let wouldBlock = false;
    try {
      const limitResult = await enforceExportLimits({
        userId: user.userId,
        requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
        rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
        estimatedRows,
        useMockStore,
      });
      rateLimitHeaders = getExportRateHeaders({
        requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
        requestRemaining: limitResult.requestRemaining,
        rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
        rowRemaining: limitResult.rowRemaining,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      if (message === "LIMIT_BACKEND_UNAVAILABLE") {
        return Response.json(
          {
            error: "service_unavailable",
            message: "Rate limiting unavailable.",
            retryAfter: 60,
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 503,
            headers: {
              ...baseHeaders,
              "Retry-After": "60",
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      wouldBlock = true;
      void recordLimitHitWithDedup({
        db: userDb,
        userId: user.userId,
        feature: "exports",
      });

      if (limitMode.effectiveMode === "enforce") {
        return Response.json(
          {
            error: "rate_limit_exceeded",
            retryAfter: WINDOW_SECONDS,
            limitPolicy: withLimitPolicy(true),
          },
          {
            status: 429,
            headers: {
              ...baseHeaders,
              "Retry-After": WINDOW_SECONDS.toString(),
              ...getExportRateHeaders({
                requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
                requestRemaining: 0,
                rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
                rowRemaining: 0,
              }),
              ...getLimitPolicyHeaders(withLimitPolicy(true)),
            },
          }
        );
      }

      rateLimitHeaders = getExportRateHeaders({
        requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
        requestRemaining: 0,
        rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
        rowRemaining: 0,
      });
    }

    const filename = generateExportFilename(category, format);
    const headers = {
      ...baseHeaders,
      ...rateLimitHeaders,
      ...getLimitPolicyHeaders(withLimitPolicy(wouldBlock)),
      "Content-Type": format === "csv" ? "text/csv" : "application/x-ndjson",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    };

    const db = userDb;
    const startedAt = Date.now();
    let exportId: number | null = null;

    if (!useMockStore && db) {
      try {
        const result = await db.execute({
          sql: `
            INSERT INTO export_history (request_id, user_id, category, format, status, started_at, filters_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [requestId, user.userId, category, format, "started", startedAt, filterHash],
        });
        exportId = (result as { lastInsertRowid?: number }).lastInsertRowid ?? null;
      } catch {
        exportId = null;
      }
    }

    let exportedCount = 0;
    let finalStatus: "complete" | "partial_timeout" | "partial_budget" | "failed_error" = "complete";
    let finalErrorCode: string | null = null;
    let finalResumeCursor: string | null = null;
    let timeoutFired = false;

    const timeout = setTimeout(() => {
      timeoutFired = true;
    }, EXPORT_TIMEOUT_MS);

    let finalized = false;
    const finalize = async () => {
      if (finalized) return;
      finalized = true;
      clearTimeout(timeout);

      if (!useMockStore && db && exportId !== null) {
        const completedAt = Date.now();
        const durationMs = completedAt - startedAt;
        try {
          await db.execute({
            sql: `
              UPDATE export_history
              SET status = ?, exported_count = ?, completed_at = ?, duration_ms = ?, error_code = ?
              WHERE id = ?
            `,
            args: [finalStatus, exportedCount, completedAt, durationMs, finalErrorCode, exportId],
          });
        } catch {
          // Ignore logging failures.
        }
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const writeNdjson = (line: string) => controller.enqueue(encoder.encode(`${line}\n`));

        try {
          if (format === "ndjson") {
            writeNdjson(JSON.stringify({ meta: { requestId, format: "ndjson", schema: "v1" } }));
          } else {
            controller.enqueue(encoder.encode(`${getCSVHeader(category)}\n`));
          }

          if (category === "saved-objects") {
            const limit = maxRows;

            if (useMockStore || !db) {
              const saved = listSavedObjects(user.userId, 1, limit).objects;
              for (const item of saved) {
                if (timeoutFired) break;
                const row = {
                  canonical_id: item.canonicalId,
                  display_name: item.displayName,
                  notes: item.notes,
                  created_at: item.createdAt,
                };
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category)}\n`));
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= limit) break;
              }
            } else {
              let offset = 0;
              while (exportedCount < limit && !timeoutFired) {
                const batchLimit = Math.min(EXPORT_CHUNK_SIZE, limit - exportedCount);
                const result = await db.execute({
                  sql: `
                    SELECT canonical_id, display_name, notes, created_at
                    FROM saved_objects
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                  `,
                  args: [user.userId, batchLimit, offset],
                });

                const rows = result.rows as Record<string, unknown>[];
                if (rows.length === 0) break;
                for (const row of rows) {
                  if (timeoutFired) break;
                  if (format === "csv") {
                    controller.enqueue(encoder.encode(`${toCSVRow(row, category)}\n`));
                  } else {
                    writeNdjson(JSON.stringify(row));
                  }
                  exportedCount += 1;
                  if (exportedCount >= limit) break;
                }

                offset += rows.length;
                if (rows.length < batchLimit) break;
              }
            }
          } else if (category === "exoplanets") {
            let cursorValue = resumeCursor?.lastId;
            let hasMore = true;

            while (hasMore && exportedCount < maxRows && !timeoutFired) {
              const limit = Math.min(EXPORT_CHUNK_SIZE, maxRows - exportedCount);
              const exoplanetParams: ExoplanetQueryParams = {
                ...(filters as ExoplanetQueryParams),
                paginationMode: "cursor",
                cursor: cursorValue,
                limit,
              };
              const result = await searchExoplanets(exoplanetParams);

              if (result.objects.length === 0) break;
              for (const item of result.objects) {
                if (timeoutFired) break;
                const row = {
                  pl_name: item.displayName,
                  hostname: item.hostStar,
                  discovery_method: item.discoveryMethod,
                  disc_year: item.discoveredYear ?? null,
                  orbital_period_days: item.orbitalPeriodDays ?? null,
                  radius_earth: item.radiusEarth ?? null,
                  mass_earth: item.massEarth ?? null,
                  equilibrium_temp_k: item.equilibriumTempK ?? null,
                  distance_parsecs: item.distanceParsecs ?? null,
                };
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category)}\n`));
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= maxRows) break;
              }

              hasMore = result.hasMore;
              cursorValue = result.nextCursor;
              if (!cursorValue) break;
            }

            if (cursorValue && (exportedCount >= maxRows || timeoutFired || hasMore)) {
              finalResumeCursor = encodeExportCursor({
                category: "exoplanets",
                lastId: cursorValue,
                filterHash,
                expiresAt: Date.now() + CURSOR_EXPIRY_MS,
              });
            }
          } else if (category === "stars") {
            let cursorValue = resumeCursor?.lastId;
            let hasMore = true;

            while (hasMore && exportedCount < maxRows && !timeoutFired) {
              const limit = Math.min(EXPORT_CHUNK_SIZE, maxRows - exportedCount);
              const starParams: StarQueryParams = {
                ...(filters as StarQueryParams),
                paginationMode: "cursor",
                cursor: cursorValue,
                limit,
              };
              const result = await searchStars(starParams);

              if (result.objects.length === 0) break;
              for (const item of result.objects) {
                if (timeoutFired) break;
                const row = {
                  hostname: item.displayName,
                  spectral_class: item.spectralClass ?? null,
                  spectral_type: item.spectralType ?? null,
                  star_temp_k: item.starTempK ?? null,
                  star_mass_solar: item.starMassSolar ?? null,
                  star_radius_solar: item.starRadiusSolar ?? null,
                  distance_parsecs: item.distanceParsecs ?? null,
                  planet_count: item.planetCount,
                  vmag: item.vMag ?? null,
                };
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category)}\n`));
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= maxRows) break;
              }

              hasMore = result.hasMore;
              cursorValue = result.nextCursor;
              if (!cursorValue) break;
            }

            if (cursorValue && (exportedCount >= maxRows || timeoutFired || hasMore)) {
              finalResumeCursor = encodeExportCursor({
                category: "stars",
                lastId: cursorValue,
                filterHash,
                expiresAt: Date.now() + CURSOR_EXPIRY_MS,
              });
            }
          } else {
            let page = 1;
            let hasMore = true;

            while (hasMore && exportedCount < maxRows && !timeoutFired) {
              const limit = Math.min(EXPORT_CHUNK_SIZE, maxRows - exportedCount);
              const smallBodyParams: SmallBodyQueryParams = {
                ...(filters as SmallBodyQueryParams),
                page,
                limit,
              };
              const result = await fetchSmallBodies(smallBodyParams);

              if (result.objects.length === 0) break;
              for (const item of result.objects) {
                if (timeoutFired) break;
                const row = {
                  display_name: item.displayName,
                  kind: item.bodyKind,
                  orbit_class: item.orbitClass,
                  neo: item.isNeo,
                  pha: item.isPha,
                  diameter_km: item.diameterKm ?? null,
                  absolute_magnitude: item.absoluteMagnitude ?? null,
                };
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category)}\n`));
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= maxRows) break;
              }

              hasMore = result.hasMore;
              page += 1;
            }
          }

          if (timeoutFired) {
            finalStatus = "partial_timeout";
            finalErrorCode = "timeout";
            if (format === "ndjson") {
              writeNdjson(
                JSON.stringify({
                  meta: {
                    status: "partial_timeout",
                    exported: exportedCount,
                    ...(finalResumeCursor ? { resumeCursor: finalResumeCursor } : {}),
                  },
                })
              );
            }
          } else if (format === "ndjson") {
            writeNdjson(
              JSON.stringify({
                meta: {
                  status: "complete",
                  exported: exportedCount,
                  ...(finalResumeCursor ? { resumeCursor: finalResumeCursor } : {}),
                },
              })
            );
          }

          controller.close();
        } catch {
          finalStatus = "failed_error";
          finalErrorCode = "unknown_error";
          if (format === "ndjson") {
            writeNdjson(
              JSON.stringify({
                meta: {
                  status: "partial_timeout",
                  exported: exportedCount,
                },
              })
            );
          }
          controller.close();
        } finally {
          await finalize();
        }
      },
      async cancel() {
        finalStatus = "failed_error";
        finalErrorCode = "abort_signal";
        await finalize();
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    return authErrorResponse(error);
  }
}
