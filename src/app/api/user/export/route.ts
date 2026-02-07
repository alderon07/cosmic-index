import { NextRequest } from "next/server";
import { requirePro, authErrorResponse } from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";
import { z } from "zod";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { listSavedObjects } from "@/lib/mock-user-store";
import { searchExoplanets } from "@/lib/exoplanet-index";
import { searchStars } from "@/lib/star-index";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";

/**
 * POST /api/user/export
 *
 * Export cosmic objects data as CSV or JSON.
 */

const MAX_EXPORT_ROWS = 5000;

const ExportSchema = z.object({
  format: z.enum(["csv", "json"]),
  category: z.enum(["exoplanets", "stars", "small-bodies", "saved-objects"]),
  queryParams: z.record(z.string(), z.unknown()).optional(),
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

async function buildExportRows(params: {
  category: "exoplanets" | "stars" | "small-bodies" | "saved-objects";
  userId: string;
  useMockStore: boolean;
}): Promise<Record<string, unknown>[]> {
  const { category, userId, useMockStore } = params;
  const db = getUserDb();

  if (category === "saved-objects") {
    if (useMockStore || !db) {
      const saved = listSavedObjects(userId, 1, MAX_EXPORT_ROWS).objects;
      return saved.map((item) => ({
        canonical_id: item.canonicalId,
        display_name: item.displayName,
        notes: item.notes,
        created_at: item.createdAt,
      }));
    }

    const result = await db.execute({
      sql: `
        SELECT canonical_id, display_name, notes, created_at
        FROM saved_objects
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      args: [userId, MAX_EXPORT_ROWS],
    });

    return result.rows as Record<string, unknown>[];
  }

  if (category === "exoplanets") {
    if (!useMockStore && db) {
      const result = await db.execute({
        sql: `
          SELECT pl_name, hostname, discovery_method, disc_year,
                 orbital_period_days, radius_earth, mass_earth,
                 equilibrium_temp_k, distance_parsecs
          FROM exoplanets
          ORDER BY pl_name ASC
          LIMIT ?
        `,
        args: [MAX_EXPORT_ROWS],
      });
      return result.rows as Record<string, unknown>[];
    }

    const result = await searchExoplanets({ page: 1, limit: 500, sort: "name" });
    return result.objects.slice(0, MAX_EXPORT_ROWS).map((item) => ({
      pl_name: item.displayName,
      hostname: item.hostStar,
      discovery_method: item.discoveryMethod,
      disc_year: item.discoveredYear ?? null,
      orbital_period_days: item.orbitalPeriodDays ?? null,
      radius_earth: item.radiusEarth ?? null,
      mass_earth: item.massEarth ?? null,
      equilibrium_temp_k: item.equilibriumTempK ?? null,
      distance_parsecs: item.distanceParsecs ?? null,
    }));
  }

  if (category === "stars") {
    if (!useMockStore && db) {
      const result = await db.execute({
        sql: `
          SELECT hostname, spectral_class, spectral_type, star_temp_k,
                 star_mass_solar, star_radius_solar, distance_parsecs,
                 planet_count, vmag
          FROM stars
          ORDER BY hostname ASC
          LIMIT ?
        `,
        args: [MAX_EXPORT_ROWS],
      });
      return result.rows as Record<string, unknown>[];
    }

    const result = await searchStars({ page: 1, limit: 500, sort: "name" });
    return result.objects.slice(0, MAX_EXPORT_ROWS).map((item) => ({
      hostname: item.displayName,
      spectral_class: item.spectralClass ?? null,
      spectral_type: item.spectralType ?? null,
      star_temp_k: item.starTempK ?? null,
      star_mass_solar: item.starMassSolar ?? null,
      star_radius_solar: item.starRadiusSolar ?? null,
      distance_parsecs: item.distanceParsecs ?? null,
      planet_count: item.planetCount,
      vmag: item.vMag ?? null,
    }));
  }

  const smallBodies = await fetchSmallBodies({ page: 1, limit: 500 });
  return smallBodies.objects.slice(0, MAX_EXPORT_ROWS).map((item) => ({
    display_name: item.displayName,
    kind: item.bodyKind,
    orbit_class: item.orbitClass,
    neo: item.isNeo,
    pha: item.isPha,
    diameter_km: item.diameterKm ?? null,
    absolute_magnitude: item.absoluteMagnitude ?? null,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePro();

    const body = await request.json();
    const parseResult = ExportSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { format, category } = parseResult.data;
    const useMockStore = isMockUserStoreEnabled();

    const rows = await buildExportRows({
      category,
      userId: user.userId,
      useMockStore,
    });

    const limitedRows = rows.slice(0, MAX_EXPORT_ROWS);

    const payload =
      format === "csv"
        ? [
            getCSVHeader(category),
            ...limitedRows.map((row) => toCSVRow(row, category)),
          ].join("\n")
        : JSON.stringify(limitedRows, null, 2);

    const filename = `cosmic-index-${category}-${new Date().toISOString().split("T")[0]}.${format}`;

    if (!useMockStore) {
      const db = getUserDb();
      if (db) {
        try {
          await db.execute({
            sql: `
              INSERT INTO export_history (user_id, category, record_count)
              VALUES (?, ?, ?)
            `,
            args: [user.userId, category, limitedRows.length],
          });
        } catch {
          // Ignore export logging errors
        }
      }
    }

    return new Response(payload + (format === "csv" ? "\n" : ""), {
      headers: {
        "Content-Type": format === "csv" ? "text/csv" : "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
