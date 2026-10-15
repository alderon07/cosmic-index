import { z } from "zod";

export const FIREBALL_RESEARCH_URL = "https://ssd-api.jpl.nasa.gov/fireball.api?date-min=2025-01-01&date-max=2025-12-31T23:59:59&sort=date&vel-comp=true";
export const FIREBALL_SNAPSHOT_PATH = "/research/fireballs-2025-retrieved-2026-10-14.json";

const responseSchema = z.strictObject({
  signature: z.strictObject({ version: z.literal("1.2"), source: z.literal("NASA/JPL Fireball Data API") }),
  count: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
  fields: z.array(z.string().min(1)).min(1).max(30),
  data: z.array(z.array(z.string().nullable()).max(30)).max(10000),
});

/** Counts reported fields, not measurement quality or population completeness. */
export function summarizeFireballs(input: unknown) {
  const response = responseSchema.parse(input);
  if (Number(response.count) !== response.data.length) throw new Error("Fireball count mismatch");
  const indices = new Map(response.fields.map((field, index) => [field, index]));
  const required = ["date", "lat", "lat-dir", "lon", "lon-dir", "alt", "vx", "vy", "vz"];
  if (indices.size !== response.fields.length || required.some((field) => !indices.has(field))) {
    throw new Error("Missing or duplicate fireball fields");
  }
  const seen = new Set<string>();
  const result = { total: response.data.length, location: 0, altitude: 0, velocity: 0, all: 0 };
  for (const row of response.data) {
    if (row.length !== response.fields.length) throw new Error("Invalid fireball row width");
    const get = (field: string) => row[indices.get(field)!];
    const date = get("date");
    if (!date || !/^2025-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date) || Number.isNaN(Date.parse(date.replace(" ", "T") + "Z")) || seen.has(date)) {
      throw new Error("Invalid or duplicate 2025 fireball date");
    }
    seen.add(date);
    const number = (field: string, min = -Infinity, max = Infinity) => {
      const value = get(field);
      if (value === null) return false;
      if (!value.trim() || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) {
        throw new Error(`Invalid fireball ${field}`);
      }
      return true;
    };
    const latitude = number("lat", 0, 90);
    const longitude = number("lon", 0, 180);
    const latitudeDirection = get("lat-dir");
    const longitudeDirection = get("lon-dir");
    if (latitudeDirection !== null && !["N", "S"].includes(latitudeDirection)) throw new Error("Invalid latitude direction");
    if (longitudeDirection !== null && !["E", "W"].includes(longitudeDirection)) throw new Error("Invalid longitude direction");
    const location = latitude && longitude && latitudeDirection !== null && longitudeDirection !== null;
    const altitude = number("alt", 0);
    const components = [number("vx"), number("vy"), number("vz")];
    const velocity = components.every(Boolean);
    result.location += Number(location);
    result.altitude += Number(altitude);
    result.velocity += Number(velocity);
    result.all += Number(location && altitude && velocity);
  }
  return result;
}
