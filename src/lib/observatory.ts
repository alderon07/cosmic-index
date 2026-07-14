import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  SpaceWeatherAlertCategory,
  SpaceWeatherAlertSource,
  SpaceWeatherSeverity,
} from "@/lib/types";
import type { UserTier } from "@/lib/auth";

export const WATCH_LIMITS: Record<UserTier, number> = {
  free: 1,
  pro: 50,
};

export const SIGNAL_RETENTION_DAYS: Record<UserTier, number> = {
  free: 30,
  pro: 180,
};

export const WATCH_DISTANCE_PRESETS = [1, 3, 5, 10, 20] as const;
export const WATCH_LEAD_TIME_PRESETS = [1, 7, 30] as const;

const SpaceWeatherCategorySchema = z.enum([
  "flr",
  "sep",
  "cme",
  "ips",
  "gst",
  "rbe",
  "mpc",
  "other",
]);

const WatchSeveritySchema = z.enum(["moderate", "strong", "severe"]);

export const SpaceWeatherWatchConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    categories: z.array(SpaceWeatherCategorySchema).min(1).max(8),
    minimumSeverity: WatchSeveritySchema,
  })
  .strict();

export const CloseApproachWatchConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    maxDistanceLd: z.union(WATCH_DISTANCE_PRESETS.map((value) => z.literal(value))),
    leadTimeDays: z.union(WATCH_LEAD_TIME_PRESETS.map((value) => z.literal(value))),
    phaOnly: z.boolean(),
  })
  .strict();

export const WatchInputSchema = z.discriminatedUnion("alertType", [
  z
    .object({
      name: z.string().trim().min(1).max(80),
      alertType: z.literal("space_weather"),
      config: SpaceWeatherWatchConfigSchema,
    })
    .strict(),
  z
    .object({
      name: z.string().trim().min(1).max(80),
      alertType: z.literal("close_approach"),
      config: CloseApproachWatchConfigSchema,
    })
    .strict(),
]);

export const WatchUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    config: z.union([
      SpaceWeatherWatchConfigSchema,
      CloseApproachWatchConfigSchema,
    ]).optional(),
    enabled: z.boolean().optional(),
    expectedUpdatedAt: z.string().min(1).max(40),
  })
  .strict();

export type SpaceWeatherWatchConfig = z.infer<typeof SpaceWeatherWatchConfigSchema>;
export type CloseApproachWatchConfig = z.infer<typeof CloseApproachWatchConfigSchema>;
export type WatchInput = z.infer<typeof WatchInputSchema>;

export function getWatchLimit(tier: UserTier): number {
  return WATCH_LIMITS[tier];
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value].sort((left, right) => String(left).localeCompare(String(right)));
  }
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJsonValue(child)]),
  );
}

export function canonicalizeWatchConfig(
  config: SpaceWeatherWatchConfig | CloseApproachWatchConfig,
): { canonical: string; hash: string } {
  const canonical = JSON.stringify(sortJsonValue(config));
  return {
    canonical,
    hash: createHash("sha256").update(canonical).digest("hex").slice(0, 32),
  };
}

const SEVERITY_RANK: Record<SpaceWeatherSeverity, number> = {
  minor: 0,
  moderate: 1,
  strong: 2,
  severe: 3,
  extreme: 4,
};

export function matchesSpaceWeatherWatch(
  config: SpaceWeatherWatchConfig,
  candidate: Pick<{ category: SpaceWeatherAlertCategory; severity: SpaceWeatherSeverity }, "category" | "severity">,
): boolean {
  return config.categories.includes(candidate.category)
    && SEVERITY_RANK[candidate.severity] >= SEVERITY_RANK[config.minimumSeverity];
}

export function toJulianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function matchesCloseApproachWatch(
  config: CloseApproachWatchConfig,
  candidate: { jd?: number; distanceLd: number; isPha?: boolean },
  now = new Date(),
): boolean {
  if (candidate.jd === undefined || !Number.isFinite(candidate.jd)) return false;
  if (candidate.distanceLd > config.maxDistanceLd) return false;
  if (config.phaOnly && candidate.isPha !== true) return false;

  const nowJd = toJulianDate(now);
  return candidate.jd >= nowJd && candidate.jd <= nowJd + config.leadTimeDays;
}

export function createSpaceWeatherTriggerKey(
  source: SpaceWeatherAlertSource,
  id: string,
): string {
  return `space-weather:${source}:${id.trim()}`;
}

export function createCloseApproachTriggerKey(designation: string, jd: number): string {
  const normalizedDesignation = designation.trim().replace(/\s+/g, " ").toUpperCase();
  const utcDay = Math.floor(jd - 0.5);
  const identity = `${normalizedDesignation}|EARTH|${utcDay}`;
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 24);
  return `close-approach:${hash}`;
}

export function getMaximumSeverity(severities: SpaceWeatherSeverity[]): SpaceWeatherSeverity {
  return severities.reduce<SpaceWeatherSeverity>(
    (maximum, severity) => SEVERITY_RANK[severity] > SEVERITY_RANK[maximum] ? severity : maximum,
    "minor",
  );
}
