import { NextRequest } from "next/server";
import { requirePro, authErrorResponse } from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";
import { z } from "zod";

/**
 * POST /api/user/export
 *
 * Export cosmic objects data as CSV or JSON.
 *
 * Features:
 * - Streaming response to handle large datasets
 * - Row limit (5000) to prevent timeouts
 * - Pro-only feature
 * - Minimal audit logging (just count, not full params)
 *
 * Supports exporting:
 * - exoplanets: From exoplanets table
 * - stars: From stars table
 * - saved-objects: User's saved objects
 */

const MAX_EXPORT_ROWS = 5000;

const ExportSchema = z.object({
  format: z.enum(["csv", "json"]),
  category: z.enum(["exoplanets", "stars", "saved-objects"]),
  queryParams: z.record(z.unknown()).optional(),
});

// CSV field definitions per category
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
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVRow(row: Record<string, unknown>, category: string): string {
  const fields = CSV_FIELDS[category] || CSV_FIELDS["saved-objects"];
  return fields.map((f) => escapeCSV(row[f.key])).join(",");
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePro();
    const db = getUserDb();

    if (!db) {
      return Response.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const parseResult = ExportSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { format, category } = parseResult.data;

    // Build query based on category
    let sql: string;
    let args: (string | number)[] = [];

    switch (category) {
      case "exoplanets":
        sql = `
          SELECT pl_name, hostname, discovery_method, disc_year,
                 orbital_period_days, radius_earth, mass_earth,
                 equilibrium_temp_k, distance_parsecs
          FROM exoplanets
          ORDER BY pl_name ASC
          LIMIT ?
        `;
        args = [MAX_EXPORT_ROWS];
        break;

      case "stars":
        sql = `
          SELECT hostname, spectral_class, spectral_type, star_temp_k,
                 star_mass_solar, star_radius_solar, distance_parsecs,
                 planet_count, vmag
          FROM stars
          ORDER BY hostname ASC
          LIMIT ?
        `;
        args = [MAX_EXPORT_ROWS];
        break;

      case "saved-objects":
        sql = `
          SELECT canonical_id, display_name, notes, created_at
          FROM saved_objects
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `;
        args = [user.userId, MAX_EXPORT_ROWS];
        break;

      default:
        return Response.json({ error: "Invalid category" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    let finalRowCount = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Write header
          if (format === "csv") {
            controller.enqueue(encoder.encode(getCSVHeader(category) + "\n"));
          } else {
            controller.enqueue(encoder.encode("[\n"));
          }

          // Fetch data
          const result = await db.execute({ sql, args });

          // Stream rows
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows[i] as Record<string, unknown>;

            const line =
              format === "csv"
                ? toCSVRow(row, category) + "\n"
                : (i > 0 ? "," : "") + JSON.stringify(row) + "\n";

            controller.enqueue(encoder.encode(line));
            finalRowCount++;
          }

          // Write footer
          if (format === "json") {
            controller.enqueue(encoder.encode("]\n"));
          }

          // Log export (best-effort, don't block download)
          try {
            await db.execute({
              sql: `
                INSERT INTO export_history (user_id, category, record_count)
                VALUES (?, ?, ?)
              `,
              args: [user.userId, category, finalRowCount],
            });
          } catch {
            // Ignore logging errors
          }
        } catch (error) {
          console.error("Export stream error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    const filename = `cosmic-index-${category}-${new Date().toISOString().split("T")[0]}.${format}`;

    return new Response(stream, {
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
