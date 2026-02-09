import {
  AnyCosmicObject,
  ExoplanetData,
  KeyFact,
  SmallBodyData,
  StarData,
  isExoplanet,
  isSmallBody,
  isStar,
} from "@/lib/types";

export type CompareDomain = "exoplanets" | "stars" | "small-bodies";
export type CompareSnapshotLevel = "list" | "detail";

export interface CompareFact {
  key: string;
  value: string;
  unit?: string;
}

export interface CompareFactSchema {
  key: string;
  label: string;
  detailOnly?: boolean;
}

export interface CompareItem {
  id: string;
  domain: CompareDomain;
  displayName: string;
  subtitle?: string;
  discoveredYear?: number;
  snapshotLevel: CompareSnapshotLevel;
  facts: CompareFact[];
}

export interface CompareStateV1 {
  version: 1;
  revision: number;
  updatedAt: number;
  domain: CompareDomain | null;
  items: CompareItem[];
}

export const MAX_COMPARE_ITEMS = 3;
export const COMPARE_STORAGE_KEY = "cosmic-index:compare:v1";

const EMPTY_COMPARE_STATE: CompareStateV1 = {
  version: 1,
  revision: 0,
  updatedAt: 0,
  domain: null,
  items: [],
};

const ALL_COMPARE_DOMAINS: CompareDomain[] = ["exoplanets", "stars", "small-bodies"];

const FACT_SCHEMAS: Record<CompareDomain, CompareFactSchema[]> = {
  exoplanets: [
    { key: "host-star", label: "Host Star" },
    { key: "radius-earth", label: "Radius", detailOnly: false },
    { key: "mass-earth", label: "Mass" },
    { key: "orbital-period-days", label: "Orbital Period" },
    { key: "distance-pc", label: "Distance" },
    { key: "equilibrium-temp-k", label: "Eq. Temp" },
    { key: "discovery-method", label: "Discovery Method" },
    { key: "discovery-year", label: "Discovery Year" },
    { key: "stars-in-system", label: "Stars in System", detailOnly: true },
    { key: "planets-in-system", label: "Planets in System", detailOnly: true },
  ],
  stars: [
    { key: "spectral-class", label: "Spectral Class" },
    { key: "spectral-type", label: "Spectral Type" },
    { key: "star-temp-k", label: "Temperature" },
    { key: "star-mass-solar", label: "Mass" },
    { key: "star-radius-solar", label: "Radius" },
    { key: "distance-pc", label: "Distance" },
    { key: "planet-count", label: "Known Planets" },
    { key: "v-mag", label: "V Magnitude" },
    { key: "k-mag", label: "K Magnitude", detailOnly: true },
    { key: "metallicity-feh", label: "Metallicity", detailOnly: true },
    { key: "age-gyr", label: "Age", detailOnly: true },
  ],
  "small-bodies": [
    { key: "body-kind", label: "Type" },
    { key: "orbit-class", label: "Orbit Class" },
    { key: "diameter-km", label: "Diameter" },
    { key: "absolute-magnitude-h", label: "Absolute Magnitude" },
    { key: "is-neo", label: "NEO" },
    { key: "is-pha", label: "PHA" },
    { key: "discovered-year", label: "Discovery Year", detailOnly: true },
  ],
};

export function emptyCompareState(): CompareStateV1 {
  return { ...EMPTY_COMPARE_STATE, items: [] };
}

function sanitizeToken(value: unknown): string {
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "bigint"
      ? String(value)
      : "";

  if (!raw) return "";

  return raw.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeCompareToken(value: unknown): string {
  const sanitized = sanitizeToken(value);
  if (!sanitized) return "";
  return encodeURIComponent(sanitized.replace(/ /g, "-").toLowerCase());
}

export function normalizeSmallBodyId(raw: unknown): string {
  return normalizeCompareToken(raw);
}

export function parseCompareDomainsEnv(raw: string | undefined): {
  enabledDomains: CompareDomain[];
  parseFailed: boolean;
} {
  if (!raw || !raw.trim()) {
    return { enabledDomains: [...ALL_COMPARE_DOMAINS], parseFailed: false };
  }

  const normalized = raw
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const allowed = new Set<CompareDomain>(ALL_COMPARE_DOMAINS);
  const parsed: CompareDomain[] = [];
  for (const token of normalized) {
    if (!allowed.has(token as CompareDomain)) {
      return { enabledDomains: ["exoplanets"], parseFailed: true };
    }
    parsed.push(token as CompareDomain);
  }

  if (parsed.length === 0) {
    return { enabledDomains: ["exoplanets"], parseFailed: true };
  }

  return { enabledDomains: Array.from(new Set(parsed)), parseFailed: false };
}

export function getCompareDomainCapabilities() {
  return parseCompareDomainsEnv(process.env.COMPARE_DOMAINS);
}

export function getCompareFactSchema(domain: CompareDomain): CompareFactSchema[] {
  return FACT_SCHEMAS[domain];
}

export function getCompareFactLabel(domain: CompareDomain, key: string): string {
  return FACT_SCHEMAS[domain].find((fact) => fact.key === key)?.label ?? key;
}

export function isDetailOnlyFactKey(domain: CompareDomain, key: string): boolean {
  return FACT_SCHEMAS[domain].some((fact) => fact.key === key && Boolean(fact.detailOnly));
}

export function getCompareDomainLabel(domain: CompareDomain | null): string {
  if (domain === "stars") return "Stars";
  if (domain === "small-bodies") return "Small Bodies";
  if (domain === "exoplanets") return "Exoplanets";
  return "Objects";
}

export function compareDomainFromCompareId(compareId: string): CompareDomain | null {
  const separator = compareId.indexOf(":");
  if (separator <= 0) return null;
  const prefix = compareId.slice(0, separator);
  if (prefix === "exoplanets" || prefix === "stars" || prefix === "small-bodies") {
    return prefix;
  }
  return null;
}

function withFact(
  facts: CompareFact[],
  key: string,
  value: number | string | null | undefined,
  options?: { unit?: string; precision?: number }
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) return;
    const precision = options?.precision ?? 2;
    facts.push({ key, value: value.toFixed(precision), unit: options?.unit });
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) return;
  facts.push({ key, value: trimmed, unit: options?.unit });
}

function getExoplanetFacts(exoplanet: ExoplanetData): CompareFact[] {
  const facts: CompareFact[] = [];
  withFact(facts, "host-star", exoplanet.hostStar);
  withFact(facts, "radius-earth", exoplanet.radiusEarth, { unit: "R⊕", precision: 2 });
  withFact(facts, "mass-earth", exoplanet.massEarth, {
    unit: "M⊕",
    precision: 2,
  });
  withFact(facts, "orbital-period-days", exoplanet.orbitalPeriodDays, {
    unit: "days",
    precision: 2,
  });
  withFact(facts, "distance-pc", exoplanet.distanceParsecs, {
    unit: "pc",
    precision: 1,
  });
  withFact(facts, "equilibrium-temp-k", exoplanet.equilibriumTempK, {
    unit: "K",
    precision: 0,
  });
  withFact(facts, "discovery-method", exoplanet.discoveryMethod);
  withFact(facts, "discovery-year", exoplanet.discoveredYear != null ? String(exoplanet.discoveredYear) : null);
  withFact(facts, "stars-in-system", exoplanet.starsInSystem, { precision: 0 });
  withFact(facts, "planets-in-system", exoplanet.planetsInSystem, { precision: 0 });
  return facts;
}

function getStarFacts(star: StarData): CompareFact[] {
  const facts: CompareFact[] = [];
  withFact(facts, "spectral-class", star.spectralClass && star.spectralClass !== "Unknown" ? star.spectralClass : null);
  withFact(facts, "spectral-type", star.spectralType);
  withFact(facts, "star-temp-k", star.starTempK, { unit: "K", precision: 0 });
  withFact(facts, "star-mass-solar", star.starMassSolar, { unit: "M☉", precision: 2 });
  withFact(facts, "star-radius-solar", star.starRadiusSolar, { unit: "R☉", precision: 2 });
  withFact(facts, "distance-pc", star.distanceParsecs, { unit: "pc", precision: 1 });
  withFact(facts, "planet-count", star.planetCount, { precision: 0 });
  withFact(facts, "v-mag", star.vMag, { precision: 2 });
  withFact(facts, "k-mag", star.kMag, { precision: 2 });
  withFact(facts, "metallicity-feh", star.metallicityFeH, { precision: 2 });
  withFact(facts, "age-gyr", star.ageGyr, { unit: "Gyr", precision: 2 });
  return facts;
}

function getSmallBodyFacts(smallBody: SmallBodyData): CompareFact[] {
  const facts: CompareFact[] = [];
  withFact(facts, "body-kind", smallBody.bodyKind === "comet" ? "Comet" : "Asteroid");
  withFact(facts, "orbit-class", smallBody.orbitClass);
  withFact(facts, "diameter-km", smallBody.diameterKm, { unit: "km", precision: 2 });
  withFact(facts, "absolute-magnitude-h", smallBody.absoluteMagnitude, { unit: "H", precision: 1 });
  withFact(facts, "is-neo", smallBody.isNeo ? "Yes" : "No");
  withFact(facts, "is-pha", smallBody.isPha ? "Yes" : "No");
  withFact(
    facts,
    "discovered-year",
    smallBody.discoveredYear != null ? String(smallBody.discoveredYear) : null
  );
  return facts;
}

export function compareDomainFromObject(object: AnyCosmicObject): CompareDomain | null {
  if (isExoplanet(object)) return "exoplanets";
  if (isStar(object)) return "stars";
  if (isSmallBody(object)) return "small-bodies";
  return null;
}

function createCanonicalCompareId(object: AnyCosmicObject, domain: CompareDomain): string | null {
  if (domain === "small-bodies") {
    const candidate = object.sourceId || object.id || object.displayName;
    if (!candidate) return null;
    const normalized = normalizeSmallBodyId(candidate);
    if (!normalized) return null;
    return `${domain}:${normalized}`;
  }

  const slug = sanitizeToken(object.id);
  if (!slug) return null;
  return `${domain}:${slug}`;
}

function getDisplayName(object: AnyCosmicObject): string | null {
  const direct = sanitizeToken(object.displayName || "");
  if (direct) return direct;

  if (isSmallBody(object)) {
    const fallback = sanitizeToken(object.sourceId || "");
    if (fallback) return fallback;
  }

  return null;
}

export function createCompareItem(
  object: AnyCosmicObject,
  snapshotLevel: CompareSnapshotLevel = "detail"
): CompareItem | null {
  const domain = compareDomainFromObject(object);
  if (!domain) {
    return null;
  }

  const id = createCanonicalCompareId(object, domain);
  if (!id) {
    return null;
  }

  const displayName = getDisplayName(object);
  if (!displayName) {
    return null;
  }

  const facts = isExoplanet(object)
    ? getExoplanetFacts(object)
    : isStar(object)
    ? getStarFacts(object)
    : getSmallBodyFacts(object);

  const subtitle = isExoplanet(object)
    ? sanitizeToken(object.hostStar || "") || undefined
    : isStar(object)
    ? sanitizeToken(object.spectralType || object.spectralClass || "") || undefined
    : sanitizeToken(object.orbitClass || "") || undefined;

  return {
    id,
    domain,
    displayName,
    subtitle,
    discoveredYear: object.discoveredYear,
    snapshotLevel,
    facts,
  };
}

export function factsFromKeyFacts(keyFacts: KeyFact[]): CompareFact[] {
  return keyFacts
    .slice(0, 8)
    .map((fact) => ({
      key: fact.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      value: fact.value,
      unit: fact.unit,
    }));
}
