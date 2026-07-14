export type FeatureTier = "free" | "pro";

export type TierLimits = {
  MAX_SAVED_OBJECTS: number;
  SAVES_PER_DAY: number;
  MAX_SAVED_SEARCHES: number;
  EXPORT_REQUESTS_PER_HOUR: number;
  EXPORT_ROWS_PER_HOUR: number;
  MAX_EXPORT_ROWS: number;
  CSV_MAX_ROWS: number;
  MAX_WATCHES: number;
};

export const TIER_LIMITS: Record<FeatureTier, TierLimits> = {
  free: {
    MAX_SAVED_OBJECTS: 150,
    SAVES_PER_DAY: 25,
    MAX_SAVED_SEARCHES: 100,
    EXPORT_REQUESTS_PER_HOUR: 1,
    EXPORT_ROWS_PER_HOUR: 6_000,
    MAX_EXPORT_ROWS: 5_000,
    CSV_MAX_ROWS: 2_000,
    MAX_WATCHES: 1,
  },
  pro: {
    MAX_SAVED_OBJECTS: 1_500,
    SAVES_PER_DAY: 250,
    MAX_SAVED_SEARCHES: 400,
    EXPORT_REQUESTS_PER_HOUR: 30,
    EXPORT_ROWS_PER_HOUR: 40_000,
    MAX_EXPORT_ROWS: 25_000,
    CSV_MAX_ROWS: 10_000,
    MAX_WATCHES: 50,
  },
};

export function getTierLimits(tier: string | null | undefined): TierLimits {
  return tier === "pro" ? TIER_LIMITS.pro : TIER_LIMITS.free;
}

export function getUpgradePayload(feature: "saved_objects" | "saved_searches") {
  if (feature === "saved_objects") {
    return {
      tier: "pro" as const,
      newLimit: TIER_LIMITS.pro.MAX_SAVED_OBJECTS,
    };
  }

  return {
    tier: "pro" as const,
    newLimit: TIER_LIMITS.pro.MAX_SAVED_SEARCHES,
  };
}
