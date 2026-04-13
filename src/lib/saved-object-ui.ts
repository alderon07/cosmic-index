import { parseCanonicalId, type CanonicalObjectType } from "@/lib/canonical-id";

export type SavedObjectUiType = CanonicalObjectType | "unknown";

export const SAVED_OBJECT_TYPE_ORDER: SavedObjectUiType[] = [
  "exoplanet",
  "star",
  "small-body",
  "close-approach",
  "fireball",
  "flr",
  "cme",
  "gst",
  "ips",
  "hss",
  "sep",
  "unknown",
];

export const SAVED_OBJECT_TYPE_LABELS: Record<SavedObjectUiType, string> = {
  exoplanet: "Exoplanets",
  star: "Stars",
  "small-body": "Small Bodies",
  "close-approach": "Close Approaches",
  fireball: "Fireballs",
  flr: "Solar Flares",
  cme: "CMEs",
  gst: "Geomagnetic Storms",
  ips: "Interplanetary Shocks",
  hss: "High-Speed Streams",
  sep: "Solar Energetic Particles",
  unknown: "Unknown",
};

export const SAVED_OBJECT_TYPE_BADGE_LABELS: Record<SavedObjectUiType, string> = {
  exoplanet: "Exoplanet",
  star: "Star",
  "small-body": "Small Body",
  "close-approach": "Close Approach",
  fireball: "Fireball",
  flr: "Solar Flare",
  cme: "CME",
  gst: "Geomagnetic Storm",
  ips: "Interplanetary Shock",
  hss: "High-Speed Stream",
  sep: "SEP",
  unknown: "Unknown",
};

export const EMPTY_SAVED_OBJECT_TYPE_COUNTS: Record<SavedObjectUiType, number> = {
  exoplanet: 0,
  star: 0,
  "small-body": 0,
  "close-approach": 0,
  fireball: 0,
  flr: 0,
  cme: 0,
  gst: 0,
  ips: 0,
  hss: 0,
  sep: 0,
  unknown: 0,
};

export function toExoplanetDetailId(id: string): string {
  // Current IDs are URI-encoded names (e.g. "Kepler-186%20f").
  if (/%[0-9a-f]{2}/i.test(id)) return id;

  // Backward compatibility for legacy kebab slugs in legacy saved data
  // (e.g. "kepler-186-f" -> "kepler-186%20f").
  const lastDash = id.lastIndexOf("-");
  if (lastDash <= 0 || lastDash >= id.length - 1) return id;
  const withSpaceBeforeSuffix = `${id.slice(0, lastDash)} ${id.slice(lastDash + 1)}`;
  return encodeURIComponent(withSpaceBeforeSuffix);
}

export function resolveSavedObjectHref(canonicalId: string): string | null {
  const parsed = parseCanonicalId(canonicalId);
  if (!parsed) return null;

  if (parsed.type === "exoplanet") return `/exoplanets/${toExoplanetDetailId(parsed.id)}`;
  if (parsed.type === "star") return `/stars/${parsed.id}`;
  if (parsed.type === "small-body") return `/small-bodies/${parsed.id}`;
  if (parsed.type === "close-approach") return "/close-approaches";
  if (parsed.type === "fireball") return "/fireballs";
  if (
    parsed.type === "flr" ||
    parsed.type === "cme" ||
    parsed.type === "gst" ||
    parsed.type === "ips" ||
    parsed.type === "hss" ||
    parsed.type === "sep"
  ) {
    return "/space-weather/events";
  }

  return null;
}

export function getSavedObjectType(canonicalId: string): SavedObjectUiType {
  const parsed = parseCanonicalId(canonicalId);
  return parsed?.type ?? "unknown";
}

export function formatSavedObjectTypeBadge(type: SavedObjectUiType): string {
  return SAVED_OBJECT_TYPE_BADGE_LABELS[type];
}
