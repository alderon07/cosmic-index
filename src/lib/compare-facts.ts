import {
  AnyCosmicObject,
  ExoplanetData,
  KeyFact,
  isExoplanet,
} from "@/lib/types";

export type CompareDomain = "exoplanets";

export interface CompareFact {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

export interface CompareItem {
  id: string;
  domain: CompareDomain;
  displayName: string;
  subtitle?: string;
  discoveredYear?: number;
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

export function emptyCompareState(): CompareStateV1 {
  return { ...EMPTY_COMPARE_STATE, items: [] };
}

function normalizeFactKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPreferredExoplanetFacts(exoplanet: ExoplanetData): CompareFact[] {
  const facts: CompareFact[] = [];

  if (exoplanet.radiusEarth != null) {
    facts.push({
      key: "radius-earth",
      label: "Radius",
      value: exoplanet.radiusEarth.toFixed(2),
      unit: "R⊕",
    });
  }
  if (exoplanet.massEarth != null) {
    facts.push({
      key: "mass-earth",
      label: exoplanet.massIsEstimated ? "Mass (est.)" : "Mass",
      value: exoplanet.massEarth.toFixed(2),
      unit: "M⊕",
    });
  }
  if (exoplanet.orbitalPeriodDays != null) {
    facts.push({
      key: "orbital-period",
      label: "Orbital Period",
      value: exoplanet.orbitalPeriodDays.toFixed(2),
      unit: "days",
    });
  }
  if (exoplanet.distanceParsecs != null) {
    facts.push({
      key: "distance",
      label: "Distance",
      value: exoplanet.distanceParsecs.toFixed(1),
      unit: "pc",
    });
  }
  if (exoplanet.equilibriumTempK != null) {
    facts.push({
      key: "equilibrium-temp",
      label: "Eq. Temp",
      value: exoplanet.equilibriumTempK.toFixed(0),
      unit: "K",
    });
  }
  if (exoplanet.discoveryMethod) {
    facts.push({
      key: "discovery-method",
      label: "Discovery Method",
      value: exoplanet.discoveryMethod,
    });
  }
  if (exoplanet.discoveredYear != null) {
    facts.push({
      key: "discovery-year",
      label: "Discovery Year",
      value: String(exoplanet.discoveredYear),
    });
  }
  if (exoplanet.hostStar) {
    facts.push({
      key: "host-star",
      label: "Host Star",
      value: exoplanet.hostStar,
    });
  }

  if (facts.length >= 8) {
    return facts.slice(0, 8);
  }

  for (const keyFact of exoplanet.keyFacts) {
    if (facts.length >= 8) break;
    const key = normalizeFactKey(keyFact.label);
    if (facts.some((fact) => fact.key === key)) continue;
    facts.push({
      key,
      label: keyFact.label,
      value: keyFact.value,
      unit: keyFact.unit,
    });
  }

  return facts;
}

export function compareDomainFromObject(
  object: AnyCosmicObject
): CompareDomain | null {
  if (isExoplanet(object)) {
    return "exoplanets";
  }
  return null;
}

export function createCompareItem(object: AnyCosmicObject): CompareItem | null {
  if (!isExoplanet(object)) {
    return null;
  }

  return {
    id: object.id,
    domain: "exoplanets",
    displayName: object.displayName,
    subtitle: object.hostStar || undefined,
    discoveredYear: object.discoveredYear,
    facts: getPreferredExoplanetFacts(object),
  };
}

export function factsFromKeyFacts(keyFacts: KeyFact[]): CompareFact[] {
  return keyFacts.slice(0, 8).map((fact) => ({
    key: normalizeFactKey(fact.label),
    label: fact.label,
    value: fact.value,
    unit: fact.unit,
  }));
}
