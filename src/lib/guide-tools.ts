export function calculateOrbitCount({ earthDays, periodDays }: { earthDays: number; periodDays: number }): number | null {
  if (!Number.isFinite(earthDays) || !Number.isFinite(periodDays) || earthDays <= 0 || periodDays <= 0) return null;
  const result = earthDays / periodDays;
  return Number.isFinite(result) ? result : null;
}
