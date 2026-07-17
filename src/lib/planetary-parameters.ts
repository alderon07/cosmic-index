import {
  PlanetaryMeasurementSchema,
  PlanetaryParametersSchema,
  type MeasurementLimit,
  type PlanetaryMeasurement,
  type PlanetaryParameters,
} from "./types";

export interface PlanetaryParameterSource {
  pl_refname?: string | null;
  pl_orbper: number | null;
  pl_orbpererr1?: number | null;
  pl_orbpererr2?: number | null;
  pl_orbperlim?: number | null;
  pl_orbsmax?: number | null;
  pl_orbsmaxerr1?: number | null;
  pl_orbsmaxerr2?: number | null;
  pl_orbsmaxlim?: number | null;
  pl_bmasse: number | null;
  pl_bmasseerr1?: number | null;
  pl_bmasseerr2?: number | null;
  pl_bmassj?: number | null;
  pl_bmassjerr1?: number | null;
  pl_bmassjerr2?: number | null;
  pl_bmassprov: string | null;
  pl_orbeccen?: number | null;
  pl_orbeccenerr1?: number | null;
  pl_orbeccenerr2?: number | null;
  pl_orbeccenlim?: number | null;
  pl_orbtper?: number | null;
  pl_orbtpererr1?: number | null;
  pl_orbtpererr2?: number | null;
  pl_orbtperlim?: number | null;
  pl_tsystemref?: string | null;
  pl_orblper?: number | null;
  pl_orblpererr1?: number | null;
  pl_orblpererr2?: number | null;
  pl_orblperlim?: number | null;
  pl_rvamp?: number | null;
  pl_rvamperr1?: number | null;
  pl_rvamperr2?: number | null;
  pl_rvamplim?: number | null;
}

function mapLimit(value: number | null | undefined): MeasurementLimit | undefined {
  if (value === 1) return "upper";
  if (value === -1) return "lower";
  return undefined;
}

function mapMeasurement(
  value: number | null | undefined,
  errorPlus: number | null | undefined,
  errorMinus: number | null | undefined,
  limit: number | null | undefined,
): PlanetaryMeasurement | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;

  const measurement = {
    value,
    ...(typeof errorPlus === "number" && Number.isFinite(errorPlus)
      ? { errorPlus: Math.abs(errorPlus) }
      : {}),
    ...(typeof errorMinus === "number" && Number.isFinite(errorMinus)
      ? { errorMinus: Math.abs(errorMinus) }
      : {}),
    ...(mapLimit(limit) ? { limit: mapLimit(limit) } : {}),
  };

  return PlanetaryMeasurementSchema.parse(measurement);
}

function plainTextReference(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 500) : undefined;
}

export function mapPlanetaryParameters(
  raw: PlanetaryParameterSource,
): PlanetaryParameters {
  return PlanetaryParametersSchema.parse({
    reference: plainTextReference(raw.pl_refname),
    orbitalPeriodDays: mapMeasurement(
      raw.pl_orbper,
      raw.pl_orbpererr1,
      raw.pl_orbpererr2,
      raw.pl_orbperlim,
    ),
    semiMajorAxisAu: mapMeasurement(
      raw.pl_orbsmax,
      raw.pl_orbsmaxerr1,
      raw.pl_orbsmaxerr2,
      raw.pl_orbsmaxlim,
    ),
    massEarth: mapMeasurement(
      raw.pl_bmasse,
      raw.pl_bmasseerr1,
      raw.pl_bmasseerr2,
      null,
    ),
    massJupiter: mapMeasurement(
      raw.pl_bmassj,
      raw.pl_bmassjerr1,
      raw.pl_bmassjerr2,
      null,
    ),
    massProvenance: raw.pl_bmassprov?.trim() || undefined,
    eccentricity: mapMeasurement(
      raw.pl_orbeccen,
      raw.pl_orbeccenerr1,
      raw.pl_orbeccenerr2,
      raw.pl_orbeccenlim,
    ),
    periastronEpoch: mapMeasurement(
      raw.pl_orbtper,
      raw.pl_orbtpererr1,
      raw.pl_orbtpererr2,
      raw.pl_orbtperlim,
    ),
    timeSystem: raw.pl_tsystemref?.trim() || undefined,
    argumentOfPeriastronDeg: mapMeasurement(
      raw.pl_orblper,
      raw.pl_orblpererr1,
      raw.pl_orblpererr2,
      raw.pl_orblperlim,
    ),
    radialVelocitySemiAmplitudeMps: mapMeasurement(
      raw.pl_rvamp,
      raw.pl_rvamperr1,
      raw.pl_rvamperr2,
      raw.pl_rvamplim,
    ),
  });
}

export function parsePlanetaryParametersJson(
  value: string | null | undefined,
): PlanetaryParameters | undefined {
  if (!value) return undefined;
  try {
    const parsed = PlanetaryParametersSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
