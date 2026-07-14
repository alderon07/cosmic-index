import { z } from "zod";

const SOURCE_HOSTS = new Set([
  "api.nasa.gov",
  "kauai.ccmc.gsfc.nasa.gov",
  "services.swpc.noaa.gov",
  "www.swpc.noaa.gov",
]);

export const InternalDestinationSchema = z.string().max(1_000).refine((value) => {
  if (!value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(value)) {
    return false;
  }
  try {
    const parsed = new URL(value, "https://cosmicindex.dev");
    return parsed.origin === "https://cosmicindex.dev";
  } catch {
    return false;
  }
}, "Signal destination must be an internal path");

export const ObservatorySourceUrlSchema = z.url().max(2_000).refine((value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && SOURCE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}, "Signal source must be an approved HTTPS upstream");

export function closeApproachAnchorId(approachId: string): string {
  return `approach-${approachId}`;
}

export function closeApproachDestination(
  config: { leadTimeDays: number; maxDistanceLd: number; phaOnly: boolean },
  candidateId?: string,
): string {
  const params = new URLSearchParams({
    days: String(config.leadTimeDays),
    distMaxLd: String(config.maxDistanceLd),
  });
  if (config.phaOnly) params.set("phaOnly", "true");
  const hash = candidateId ? `#${closeApproachAnchorId(candidateId)}` : "";
  return `/close-approaches?${params.toString()}${hash}`;
}
