import {
  PlanetaryMeasurementSchema,
  StellarHostParametersSchema,
  type MeasurementLimit,
  type ScientificMeasurement,
  type StellarHostParameters,
  type StellarPhotometry,
  type StellarSolution,
  type StarData,
} from "./types";

type NullableNumber = number | null | undefined;
type NullableString = string | null | undefined;

export interface StellarHostSourceRow {
  hostname: string;
  hd_name?: NullableString;
  hip_name?: NullableString;
  tic_id?: NullableString;
  gaia_dr2_id?: NullableString;
  gaia_dr3_id?: NullableString;
  st_refname?: NullableString;
  sy_refname?: NullableString;
  ra?: NullableNumber;
  rastr?: NullableString;
  dec?: NullableNumber;
  decstr?: NullableString;
  glon?: NullableNumber;
  glat?: NullableNumber;
  elon?: NullableNumber;
  elat?: NullableNumber;
  sy_snum?: NullableNumber;
  sy_pnum?: NullableNumber;
  sy_mnum?: NullableNumber;
  cb_flag?: NullableNumber;
  sy_pm?: NullableNumber;
  sy_pmerr1?: NullableNumber;
  sy_pmerr2?: NullableNumber;
  sy_pmra?: NullableNumber;
  sy_pmraerr1?: NullableNumber;
  sy_pmraerr2?: NullableNumber;
  sy_pmdec?: NullableNumber;
  sy_pmdecerr1?: NullableNumber;
  sy_pmdecerr2?: NullableNumber;
  sy_plx?: NullableNumber;
  sy_plxerr1?: NullableNumber;
  sy_plxerr2?: NullableNumber;
  sy_dist?: NullableNumber;
  sy_disterr1?: NullableNumber;
  sy_disterr2?: NullableNumber;
  sy_umag?: NullableNumber;
  sy_umagerr1?: NullableNumber;
  sy_umagerr2?: NullableNumber;
  sy_bmag?: NullableNumber;
  sy_bmagerr1?: NullableNumber;
  sy_bmagerr2?: NullableNumber;
  sy_vmag?: NullableNumber;
  sy_vmagerr1?: NullableNumber;
  sy_vmagerr2?: NullableNumber;
  sy_gmag?: NullableNumber;
  sy_gmagerr1?: NullableNumber;
  sy_gmagerr2?: NullableNumber;
  sy_rmag?: NullableNumber;
  sy_rmagerr1?: NullableNumber;
  sy_rmagerr2?: NullableNumber;
  sy_imag?: NullableNumber;
  sy_imagerr1?: NullableNumber;
  sy_imagerr2?: NullableNumber;
  sy_icmag?: NullableNumber;
  sy_icmagerr1?: NullableNumber;
  sy_icmagerr2?: NullableNumber;
  sy_zmag?: NullableNumber;
  sy_zmagerr1?: NullableNumber;
  sy_zmagerr2?: NullableNumber;
  sy_jmag?: NullableNumber;
  sy_jmagerr1?: NullableNumber;
  sy_jmagerr2?: NullableNumber;
  sy_hmag?: NullableNumber;
  sy_hmagerr1?: NullableNumber;
  sy_hmagerr2?: NullableNumber;
  sy_kmag?: NullableNumber;
  sy_kmagerr1?: NullableNumber;
  sy_kmagerr2?: NullableNumber;
  sy_w1mag?: NullableNumber;
  sy_w1magerr1?: NullableNumber;
  sy_w1magerr2?: NullableNumber;
  sy_w2mag?: NullableNumber;
  sy_w2magerr1?: NullableNumber;
  sy_w2magerr2?: NullableNumber;
  sy_w3mag?: NullableNumber;
  sy_w3magerr1?: NullableNumber;
  sy_w3magerr2?: NullableNumber;
  sy_w4mag?: NullableNumber;
  sy_w4magerr1?: NullableNumber;
  sy_w4magerr2?: NullableNumber;
  sy_gaiamag?: NullableNumber;
  sy_gaiamagerr1?: NullableNumber;
  sy_gaiamagerr2?: NullableNumber;
  sy_tmag?: NullableNumber;
  sy_tmagerr1?: NullableNumber;
  sy_tmagerr2?: NullableNumber;
  sy_kepmag?: NullableNumber;
  sy_kepmagerr1?: NullableNumber;
  sy_kepmagerr2?: NullableNumber;
  st_spectype?: NullableString;
  st_teff?: NullableNumber;
  st_tefferr1?: NullableNumber;
  st_tefferr2?: NullableNumber;
  st_tefflim?: NullableNumber;
  st_rad?: NullableNumber;
  st_raderr1?: NullableNumber;
  st_raderr2?: NullableNumber;
  st_radlim?: NullableNumber;
  st_mass?: NullableNumber;
  st_masserr1?: NullableNumber;
  st_masserr2?: NullableNumber;
  st_masslim?: NullableNumber;
  st_met?: NullableNumber;
  st_meterr1?: NullableNumber;
  st_meterr2?: NullableNumber;
  st_metlim?: NullableNumber;
  st_metratio?: NullableString;
  st_lum?: NullableNumber;
  st_lumerr1?: NullableNumber;
  st_lumerr2?: NullableNumber;
  st_lumlim?: NullableNumber;
  st_logg?: NullableNumber;
  st_loggerr1?: NullableNumber;
  st_loggerr2?: NullableNumber;
  st_logglim?: NullableNumber;
  st_age?: NullableNumber;
  st_ageerr1?: NullableNumber;
  st_ageerr2?: NullableNumber;
  st_agelim?: NullableNumber;
  st_vsin?: NullableNumber;
  st_vsinerr1?: NullableNumber;
  st_vsinerr2?: NullableNumber;
  st_vsinlim?: NullableNumber;
  st_radv?: NullableNumber;
  st_radverr1?: NullableNumber;
  st_radverr2?: NullableNumber;
  st_radvlim?: NullableNumber;
  st_dens?: NullableNumber;
  st_denserr1?: NullableNumber;
  st_denserr2?: NullableNumber;
  st_denslim?: NullableNumber;
  st_rotp?: NullableNumber;
  st_rotperr1?: NullableNumber;
  st_rotperr2?: NullableNumber;
  st_rotplim?: NullableNumber;
}

export interface HypatiaCompositionSource {
  name?: string;
  element?: string;
  median_value?: number;
  plusminus?: number | null;
  solarnorm?: string;
  requested_element?: string;
}

function finite(value: NullableNumber): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonEmpty(value: NullableString): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function mapLimit(value: NullableNumber): MeasurementLimit | undefined {
  if (value === 1) return "upper";
  if (value === -1) return "lower";
  return undefined;
}

function mapMeasurement(
  value: NullableNumber,
  errorPlus?: NullableNumber,
  errorMinus?: NullableNumber,
  limit?: NullableNumber,
): ScientificMeasurement | undefined {
  const measuredValue = finite(value);
  if (measuredValue === undefined) return undefined;
  const upperError = finite(errorPlus);
  const lowerError = finite(errorMinus);
  const measurementLimit = mapLimit(limit);

  return PlanetaryMeasurementSchema.parse({
    value: measuredValue,
    ...(upperError !== undefined ? { errorPlus: Math.abs(upperError) } : {}),
    ...(lowerError !== undefined ? { errorMinus: Math.abs(lowerError) } : {}),
    ...(measurementLimit ? { limit: measurementLimit } : {}),
  });
}

function plainTextReference(value: NullableString): string | undefined {
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

const PHOTOMETRY_FIELDS: ReadonlyArray<{
  band: string;
  catalog: string;
  value: keyof StellarHostSourceRow;
  errorPlus: keyof StellarHostSourceRow;
  errorMinus: keyof StellarHostSourceRow;
}> = [
  { band: "u", catalog: "Sloan", value: "sy_umag", errorPlus: "sy_umagerr1", errorMinus: "sy_umagerr2" },
  { band: "B", catalog: "Johnson", value: "sy_bmag", errorPlus: "sy_bmagerr1", errorMinus: "sy_bmagerr2" },
  { band: "V", catalog: "Johnson", value: "sy_vmag", errorPlus: "sy_vmagerr1", errorMinus: "sy_vmagerr2" },
  { band: "g", catalog: "Sloan", value: "sy_gmag", errorPlus: "sy_gmagerr1", errorMinus: "sy_gmagerr2" },
  { band: "r", catalog: "Sloan", value: "sy_rmag", errorPlus: "sy_rmagerr1", errorMinus: "sy_rmagerr2" },
  { band: "i", catalog: "Sloan", value: "sy_imag", errorPlus: "sy_imagerr1", errorMinus: "sy_imagerr2" },
  { band: "I", catalog: "Cousins", value: "sy_icmag", errorPlus: "sy_icmagerr1", errorMinus: "sy_icmagerr2" },
  { band: "z", catalog: "Sloan", value: "sy_zmag", errorPlus: "sy_zmagerr1", errorMinus: "sy_zmagerr2" },
  { band: "J", catalog: "2MASS", value: "sy_jmag", errorPlus: "sy_jmagerr1", errorMinus: "sy_jmagerr2" },
  { band: "H", catalog: "2MASS", value: "sy_hmag", errorPlus: "sy_hmagerr1", errorMinus: "sy_hmagerr2" },
  { band: "Ks", catalog: "2MASS", value: "sy_kmag", errorPlus: "sy_kmagerr1", errorMinus: "sy_kmagerr2" },
  { band: "W1", catalog: "WISE", value: "sy_w1mag", errorPlus: "sy_w1magerr1", errorMinus: "sy_w1magerr2" },
  { band: "W2", catalog: "WISE", value: "sy_w2mag", errorPlus: "sy_w2magerr1", errorMinus: "sy_w2magerr2" },
  { band: "W3", catalog: "WISE", value: "sy_w3mag", errorPlus: "sy_w3magerr1", errorMinus: "sy_w3magerr2" },
  { band: "W4", catalog: "WISE", value: "sy_w4mag", errorPlus: "sy_w4magerr1", errorMinus: "sy_w4magerr2" },
  { band: "Gaia", catalog: "Gaia", value: "sy_gaiamag", errorPlus: "sy_gaiamagerr1", errorMinus: "sy_gaiamagerr2" },
  { band: "TESS", catalog: "TESS", value: "sy_tmag", errorPlus: "sy_tmagerr1", errorMinus: "sy_tmagerr2" },
  { band: "Kepler", catalog: "Kepler", value: "sy_kepmag", errorPlus: "sy_kepmagerr1", errorMinus: "sy_kepmagerr2" },
];

function mapPhotometry(row: StellarHostSourceRow): StellarPhotometry[] {
  return PHOTOMETRY_FIELDS.flatMap((field) => {
    const magnitude = mapMeasurement(
      row[field.value] as NullableNumber,
      row[field.errorPlus] as NullableNumber,
      row[field.errorMinus] as NullableNumber,
    );
    return magnitude ? [{ band: field.band, catalog: field.catalog, magnitude }] : [];
  });
}

function mapSolution(row: StellarHostSourceRow): StellarSolution | null {
  const reference = plainTextReference(row.st_refname);
  if (!reference) return null;

  const solution: StellarSolution = {
    reference,
    ...(nonEmpty(row.st_spectype) ? { spectralType: nonEmpty(row.st_spectype) } : {}),
    effectiveTemperatureK: mapMeasurement(row.st_teff, row.st_tefferr1, row.st_tefferr2, row.st_tefflim),
    radiusSolar: mapMeasurement(row.st_rad, row.st_raderr1, row.st_raderr2, row.st_radlim),
    massSolar: mapMeasurement(row.st_mass, row.st_masserr1, row.st_masserr2, row.st_masslim),
    metallicityDex: mapMeasurement(row.st_met, row.st_meterr1, row.st_meterr2, row.st_metlim),
    ...(nonEmpty(row.st_metratio) ? { metallicityRatio: nonEmpty(row.st_metratio) } : {}),
    luminosityLogSolar: mapMeasurement(row.st_lum, row.st_lumerr1, row.st_lumerr2, row.st_lumlim),
    surfaceGravityLogCgs: mapMeasurement(row.st_logg, row.st_loggerr1, row.st_loggerr2, row.st_logglim),
    ageGyr: mapMeasurement(row.st_age, row.st_ageerr1, row.st_ageerr2, row.st_agelim),
    rotationalVelocityKms: mapMeasurement(row.st_vsin, row.st_vsinerr1, row.st_vsinerr2, row.st_vsinlim),
    radialVelocityKms: mapMeasurement(row.st_radv, row.st_radverr1, row.st_radverr2, row.st_radvlim),
    densityCgs: mapMeasurement(row.st_dens, row.st_denserr1, row.st_denserr2, row.st_denslim),
    rotationPeriodDays: mapMeasurement(row.st_rotp, row.st_rotperr1, row.st_rotperr2, row.st_rotplim),
  };

  const compact = Object.fromEntries(
    Object.entries(solution).filter(([, value]) => value !== undefined),
  ) as StellarSolution;
  return Object.keys(compact).length > 1 ? compact : null;
}

function mapAbundances(rows: HypatiaCompositionSource[]) {
  return rows.flatMap((row) => {
    if (row.name === "not-found" || !row.element || finite(row.median_value) === undefined) {
      return [];
    }
    const normalizedElement = row.element.replace(/_/g, " ");
    const notationElement = row.element.replace(/_/g, "");
    return [{
      element: normalizedElement,
      notation: `[${notationElement}/H]`,
      medianDex: row.median_value,
      ...(finite(row.plusminus) !== undefined ? { spreadDex: Math.abs(row.plusminus as number) } : {}),
      ...(nonEmpty(row.solarnorm) ? { solarNormalization: nonEmpty(row.solarnorm) } : {}),
    }];
  });
}

export function mapStellarHostParameters(
  rows: StellarHostSourceRow[],
  abundanceRows: HypatiaCompositionSource[],
): StellarHostParameters {
  const overview = rows[0];
  if (!overview) {
    return StellarHostParametersSchema.parse({
      identifiers: {},
      coordinates: {},
      photometry: [],
      abundances: [],
      solutions: [],
    });
  }

  const parameters = {
    systemReference: plainTextReference(overview.sy_refname),
    identifiers: {
      hd: nonEmpty(overview.hd_name),
      hip: nonEmpty(overview.hip_name),
      tic: nonEmpty(overview.tic_id),
      gaiaDR2: nonEmpty(overview.gaia_dr2_id),
      gaiaDR3: nonEmpty(overview.gaia_dr3_id),
    },
    coordinates: {
      raDeg: finite(overview.ra),
      decDeg: finite(overview.dec),
      raSexagesimal: nonEmpty(overview.rastr),
      decSexagesimal: nonEmpty(overview.decstr),
      galacticLongitudeDeg: finite(overview.glon),
      galacticLatitudeDeg: finite(overview.glat),
      eclipticLongitudeDeg: finite(overview.elon),
      eclipticLatitudeDeg: finite(overview.elat),
    },
    distanceParsecs: mapMeasurement(overview.sy_dist, overview.sy_disterr1, overview.sy_disterr2),
    parallaxMas: mapMeasurement(overview.sy_plx, overview.sy_plxerr1, overview.sy_plxerr2),
    properMotionMasPerYear: mapMeasurement(overview.sy_pm, overview.sy_pmerr1, overview.sy_pmerr2),
    properMotionRaMasPerYear: mapMeasurement(overview.sy_pmra, overview.sy_pmraerr1, overview.sy_pmraerr2),
    properMotionDecMasPerYear: mapMeasurement(overview.sy_pmdec, overview.sy_pmdecerr1, overview.sy_pmdecerr2),
    starsInSystem: finite(overview.sy_snum),
    planetsInSystem: finite(overview.sy_pnum),
    moonsInSystem: finite(overview.sy_mnum),
    ...(overview.cb_flag === 0 || overview.cb_flag === 1
      ? { circumbinary: overview.cb_flag === 1 }
      : {}),
    photometry: mapPhotometry(overview),
    abundances: mapAbundances(abundanceRows),
    solutions: rows.slice(0, 50).map(mapSolution).filter((solution): solution is StellarSolution => solution !== null),
  };

  return StellarHostParametersSchema.parse(parameters);
}

export function stellarParameterAliases(parameters: StellarHostParameters): string[] {
  return Object.values(parameters.identifiers).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

export function enrichStarWithStellarParameters(
  star: StarData,
  parameters: StellarHostParameters | null,
): StarData {
  if (!parameters) return star;

  const aliases = Array.from(new Set([
    ...star.aliases,
    ...stellarParameterAliases(parameters),
  ])).filter((alias) => alias.toLocaleLowerCase() !== star.hostname.toLocaleLowerCase());

  return {
    ...star,
    aliases,
    stellarParameters: parameters,
  };
}
