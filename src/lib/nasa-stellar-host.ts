import { z } from "zod";
import {
  CACHE_KEYS,
  CACHE_TTL,
  getCachedMany,
  setCachedMany,
  withCache,
} from "./cache";
import { createSlug, type StellarHostParameters } from "./types";
import { escapeAdqlString, executeTAPQuery } from "./nasa-exoplanet";
import {
  mapStellarHostParameters,
  type HypatiaCompositionSource,
  type StellarHostSourceRow,
} from "./stellar-parameters";

const STELLAR_STRING_COLUMNS = [
  "hd_name", "hip_name", "tic_id", "gaia_dr2_id", "gaia_dr3_id",
  "st_refname", "sy_refname", "rastr", "decstr", "st_spectype", "st_metratio",
] as const;

const STELLAR_NUMBER_COLUMNS = [
  "ra", "dec", "glon", "glat", "elon", "elat", "sy_snum", "sy_pnum", "sy_mnum", "cb_flag",
  "sy_pm", "sy_pmerr1", "sy_pmerr2", "sy_pmra", "sy_pmraerr1", "sy_pmraerr2",
  "sy_pmdec", "sy_pmdecerr1", "sy_pmdecerr2", "sy_plx", "sy_plxerr1", "sy_plxerr2",
  "sy_dist", "sy_disterr1", "sy_disterr2",
  "sy_umag", "sy_umagerr1", "sy_umagerr2", "sy_bmag", "sy_bmagerr1", "sy_bmagerr2",
  "sy_vmag", "sy_vmagerr1", "sy_vmagerr2", "sy_gmag", "sy_gmagerr1", "sy_gmagerr2",
  "sy_rmag", "sy_rmagerr1", "sy_rmagerr2", "sy_imag", "sy_imagerr1", "sy_imagerr2",
  "sy_icmag", "sy_icmagerr1", "sy_icmagerr2", "sy_zmag", "sy_zmagerr1", "sy_zmagerr2",
  "sy_jmag", "sy_jmagerr1", "sy_jmagerr2", "sy_hmag", "sy_hmagerr1", "sy_hmagerr2",
  "sy_kmag", "sy_kmagerr1", "sy_kmagerr2", "sy_w1mag", "sy_w1magerr1", "sy_w1magerr2",
  "sy_w2mag", "sy_w2magerr1", "sy_w2magerr2", "sy_w3mag", "sy_w3magerr1", "sy_w3magerr2",
  "sy_w4mag", "sy_w4magerr1", "sy_w4magerr2", "sy_gaiamag", "sy_gaiamagerr1", "sy_gaiamagerr2",
  "sy_tmag", "sy_tmagerr1", "sy_tmagerr2", "sy_kepmag", "sy_kepmagerr1", "sy_kepmagerr2",
  "st_teff", "st_tefferr1", "st_tefferr2", "st_tefflim",
  "st_rad", "st_raderr1", "st_raderr2", "st_radlim",
  "st_mass", "st_masserr1", "st_masserr2", "st_masslim",
  "st_met", "st_meterr1", "st_meterr2", "st_metlim",
  "st_lum", "st_lumerr1", "st_lumerr2", "st_lumlim",
  "st_logg", "st_loggerr1", "st_loggerr2", "st_logglim",
  "st_age", "st_ageerr1", "st_ageerr2", "st_agelim",
  "st_vsin", "st_vsinerr1", "st_vsinerr2", "st_vsinlim",
  "st_radv", "st_radverr1", "st_radverr2", "st_radvlim",
  "st_dens", "st_denserr1", "st_denserr2", "st_denslim",
  "st_rotp", "st_rotperr1", "st_rotperr2", "st_rotplim",
] as const;

const STELLAR_HOST_COLUMNS = [
  "hostname",
  ...STELLAR_STRING_COLUMNS,
  ...STELLAR_NUMBER_COLUMNS,
].join(",");

const StellarHostRawSchema = z.object({
  hostname: z.string().trim().min(1).max(256),
  ...Object.fromEntries(
    STELLAR_STRING_COLUMNS.map((column) => [column, z.string().max(2_000).nullable()]),
  ),
  ...Object.fromEntries(
    STELLAR_NUMBER_COLUMNS.map((column) => [column, z.number().finite().nullable()]),
  ),
}).strict();

const HypatiaCompositionSchema = z.object({
  name: z.string().max(256).optional(),
  requested_name: z.string().max(256).optional(),
  nea_name: z.string().max(256).optional(),
  element: z.string().max(32).optional(),
  median_value: z.number().finite().optional(),
  plusminus: z.number().finite().nullable().optional(),
  solarnorm: z.string().max(64).optional(),
  requested_element: z.string().max(32).optional(),
});

const HYPATIA_ELEMENTS = ["Fe", "C", "O", "Na", "Mg", "Al", "Si", "Ca", "Y", "Ba_II"] as const;
const HYPATIA_URL = "https://hypatiacatalog.com/hypatia/api/v2/composition/";
const HYPATIA_TIMEOUT_MS = 5_000;
const MAX_STELLAR_SOLUTIONS = 50;
export const MAX_STELLAR_HOST_BATCH_SIZE = 50;

function normalizeHostKey(hostname: string): string {
  return hostname.trim().toLocaleLowerCase("en-US");
}

function stellarHostCacheKey(hostname: string): string {
  return `${CACHE_KEYS.STARS_PARAMETERS}:${createSlug(hostname)}`;
}

export function buildStellarHostQuery(hostname: string): string {
  return `select ${STELLAR_HOST_COLUMNS} from stellarhosts ` +
    `where lower(hostname)=lower('${escapeAdqlString(hostname)}') order by st_refname asc`;
}

export function buildStellarHostBatchQuery(hostnames: string[]): string {
  const uniqueHosts = [...new Set(hostnames.map((hostname) => normalizeHostKey(hostname)).filter(Boolean))];
  if (uniqueHosts.length === 0 || uniqueHosts.length > MAX_STELLAR_HOST_BATCH_SIZE) {
    throw new Error(
      `Stellar-host batches must contain 1-${MAX_STELLAR_HOST_BATCH_SIZE} unique hostnames`,
    );
  }
  const values = uniqueHosts
    .map((hostname) => `'${escapeAdqlString(hostname)}'`)
    .join(",");
  return `select ${STELLAR_HOST_COLUMNS} from stellarhosts ` +
    `where lower(hostname) in (${values}) order by hostname asc, st_refname asc`;
}

async function fetchHypatiaAbundances(name: string): Promise<HypatiaCompositionSource[]> {
  const url = new URL(HYPATIA_URL);
  for (const element of HYPATIA_ELEMENTS) {
    url.searchParams.append("name", name);
    url.searchParams.append("element", element);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HYPATIA_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "cosmic-index/1.0" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Hypatia API error: ${response.status}`);

    const parsed = z.array(HypatiaCompositionSchema).max(HYPATIA_ELEMENTS.length).safeParse(
      await response.json(),
    );
    if (!parsed.success) throw new Error("Hypatia API returned an unexpected response shape");
    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHypatiaAbundancesBatch(
  names: string[],
): Promise<Map<string, HypatiaCompositionSource[]>> {
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (uniqueNames.length === 0) return new Map();

  const url = new URL(HYPATIA_URL);
  for (const name of uniqueNames) {
    for (const element of HYPATIA_ELEMENTS) {
      url.searchParams.append("name", name);
      url.searchParams.append("element", element);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HYPATIA_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "cosmic-index/1.0" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Hypatia API error: ${response.status}`);

    const parsed = z.array(HypatiaCompositionSchema)
      .max(uniqueNames.length * HYPATIA_ELEMENTS.length)
      .safeParse(await response.json());
    if (!parsed.success) throw new Error("Hypatia API returned an unexpected batch response shape");

    const rowsByName = new Map<string, HypatiaCompositionSource[]>();
    for (const row of parsed.data) {
      const requestedName = row.requested_name;
      if (!requestedName) continue;
      const key = normalizeHostKey(requestedName);
      const rows = rowsByName.get(key) ?? [];
      rows.push(row);
      rowsByName.set(key, rows);
    }
    return rowsByName;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchStellarHostParametersBatch(
  hostnames: string[],
): Promise<Map<string, StellarHostParameters | null>> {
  const requestedHosts = [...new Set(hostnames.map((hostname) => hostname.trim()).filter(Boolean))];
  if (requestedHosts.length === 0) return new Map();
  if (requestedHosts.length > MAX_STELLAR_HOST_BATCH_SIZE) {
    throw new Error(`Stellar-host batch exceeds ${MAX_STELLAR_HOST_BATCH_SIZE} hosts`);
  }

  const cacheKeys = requestedHosts.map(stellarHostCacheKey);
  const cached = await getCachedMany<StellarHostParameters>(cacheKeys);
  const result = new Map<string, StellarHostParameters | null>();
  const misses: string[] = [];
  for (let index = 0; index < requestedHosts.length; index += 1) {
    const hostname = requestedHosts[index]!;
    const parameters = cached[index];
    if (parameters) {
      result.set(hostname, parameters);
    } else {
      misses.push(hostname);
    }
  }
  if (misses.length === 0) return result;

  const requestedByKey = new Map(misses.map((hostname) => [normalizeHostKey(hostname), hostname]));
  const rawRows = await executeTAPQuery(buildStellarHostBatchQuery(misses), {
    maxrec: misses.length * MAX_STELLAR_SOLUTIONS,
  });
  const rowsByHost = new Map<string, StellarHostSourceRow[]>();
  for (const row of rawRows) {
    const parsed = StellarHostRawSchema.safeParse(row);
    if (!parsed.success) {
      console.warn("Failed to parse stellar-host batch solution:", parsed.error);
      continue;
    }
    const hostKey = normalizeHostKey(parsed.data.hostname);
    if (!requestedByKey.has(hostKey)) continue;
    const rows = rowsByHost.get(hostKey) ?? [];
    if (rows.length < MAX_STELLAR_SOLUTIONS) {
      rows.push(parsed.data as unknown as StellarHostSourceRow);
    }
    rowsByHost.set(hostKey, rows);
  }

  const hypatiaNameByHost = new Map<string, string>();
  for (const [hostKey, rows] of rowsByHost) {
    const overview = mapStellarHostParameters(rows, []);
    hypatiaNameByHost.set(
      hostKey,
      overview.identifiers.hip ?? overview.identifiers.hd ?? requestedByKey.get(hostKey)!,
    );
  }

  let abundanceRowsByName = new Map<string, HypatiaCompositionSource[]>();
  try {
    abundanceRowsByName = await fetchHypatiaAbundancesBatch([...hypatiaNameByHost.values()]);
  } catch (error) {
    console.warn(
      "Hypatia batch abundances unavailable:",
      error instanceof Error ? error.message : error,
    );
  }

  const cacheEntries: Array<{ key: string; data: StellarHostParameters }> = [];
  for (const hostname of misses) {
    const hostKey = normalizeHostKey(hostname);
    const rows = rowsByHost.get(hostKey);
    if (!rows || rows.length === 0) {
      result.set(hostname, null);
      continue;
    }
    const hypatiaName = hypatiaNameByHost.get(hostKey);
    const parameters = mapStellarHostParameters(
      rows,
      hypatiaName ? abundanceRowsByName.get(normalizeHostKey(hypatiaName)) ?? [] : [],
    );
    result.set(hostname, parameters);
    cacheEntries.push({ key: stellarHostCacheKey(hostname), data: parameters });
  }
  await setCachedMany(cacheEntries, CACHE_TTL.STARS_PARAMETERS);
  return result;
}

export async function fetchStellarHostParameters(
  hostname: string,
): Promise<StellarHostParameters | null> {
  const cacheKey = stellarHostCacheKey(hostname);

  return withCache(cacheKey, CACHE_TTL.STARS_PARAMETERS, async () => {
    const rawRows = await executeTAPQuery(buildStellarHostQuery(hostname), {
      maxrec: MAX_STELLAR_SOLUTIONS,
    });

    const rows = rawRows.flatMap((row) => {
      const parsed = StellarHostRawSchema.safeParse(row);
      if (!parsed.success) {
        console.warn("Failed to parse stellar-host solution:", parsed.error);
        return [];
      }
      return [parsed.data as unknown as StellarHostSourceRow];
    });
    if (rows.length === 0) return null;

    const overview = mapStellarHostParameters(rows, []);
    const hypatiaName = overview.identifiers.hip ?? overview.identifiers.hd ?? hostname;

    let abundances: HypatiaCompositionSource[] = [];
    try {
      abundances = await fetchHypatiaAbundances(hypatiaName);
    } catch (error) {
      console.warn(
        `Hypatia abundances unavailable for ${hostname}:`,
        error instanceof Error ? error.message : error,
      );
    }

    return mapStellarHostParameters(rows, abundances);
  });
}
