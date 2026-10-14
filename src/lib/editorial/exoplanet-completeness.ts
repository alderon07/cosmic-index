import { z } from "zod";

export const COMPLETENESS_QUERY = "select pl_name,discoverymethod,pl_rade,pl_radelim,pl_masse,pl_masselim,pl_msinie,pl_msinielim from ps where default_flag=1 order by pl_name";
export const COMPLETENESS_URL = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(COMPLETENESS_QUERY)}&format=json`;

const value = z.number().finite().nullable();
const flag = z.union([z.literal(-1), z.literal(0), z.literal(1)]).nullable();
const recordsSchema = z.array(z.strictObject({
  pl_name: z.string().min(1),
  discoverymethod: z.string().min(1),
  pl_rade: value, pl_radelim: flag,
  pl_masse: value, pl_masselim: flag,
  pl_msinie: value, pl_msinielim: flag,
})).min(1).max(20000);

export interface CompletenessGroup {
  method: string;
  total: number;
  radius: number;
  mass: number;
  both: number;
  minimumMass: number;
}

/** Availability in default PS solutions, not a claim of independent measurement. */
export function summarizeCompleteness(input: unknown): CompletenessGroup[] {
  const records = recordsSchema.parse(input);
  const seen = new Set<string>();
  const groups = new Map<string, CompletenessGroup>();
  const eligible = (measurement: number | null, limit: number | null) =>
    measurement !== null && measurement > 0 && limit === 0;
  for (const record of records) {
    if (seen.has(record.pl_name)) throw new Error(`Duplicate planet: ${record.pl_name}`);
    seen.add(record.pl_name);
    const group = groups.get(record.discoverymethod) ?? {
      method: record.discoverymethod, total: 0, radius: 0, mass: 0, both: 0, minimumMass: 0,
    };
    const radius = eligible(record.pl_rade, record.pl_radelim);
    const mass = eligible(record.pl_masse, record.pl_masselim);
    group.total++;
    group.radius += Number(radius);
    group.mass += Number(mass);
    group.both += Number(radius && mass);
    group.minimumMass += Number(eligible(record.pl_msinie, record.pl_msinielim));
    groups.set(group.method, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.method.localeCompare(b.method));
}
