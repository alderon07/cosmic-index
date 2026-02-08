import crypto from "node:crypto";

type ExportCursorCategory = "exoplanets" | "stars";

export type ExportCursor = {
  category: ExportCursorCategory;
  lastId: string;
  filterHash: string;
  expiresAt: number;
};

function normalizeBase64(value: string): string {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  if (padding > 0) {
    normalized += "=".repeat(4 - padding);
  }
  return normalized;
}

export function decodeExportCursor(value: string): ExportCursor | null {
  try {
    const decoded = Buffer.from(normalizeBase64(value), "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as ExportCursor;
    if (
      !parsed ||
      (parsed.category !== "exoplanets" && parsed.category !== "stars") ||
      typeof parsed.lastId !== "string" ||
      typeof parsed.filterHash !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function encodeExportCursor(cursor: ExportCursor): string {
  const payload = JSON.stringify(cursor);
  return Buffer.from(payload, "utf8").toString("base64");
}

export function computeFilterHash(filters: Record<string, unknown>): string {
  const rest = { ...filters } as Record<string, unknown>;
  delete rest.cursor;
  delete rest.page;
  delete rest.limit;
  const provided = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null)
    .reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  const canonical = JSON.stringify(provided, Object.keys(provided).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export function generateExportFilename(category: string, format: string): string {
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  return `${category}_${date}.${format}`;
}
