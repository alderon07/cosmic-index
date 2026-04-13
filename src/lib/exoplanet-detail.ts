import type { ExoplanetData } from "@/lib/types";

function formatDecimal(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function joinWithAnd(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

export function buildExoplanetDetailNarrative(exoplanet: ExoplanetData): string[] {
  const sentences: string[] = [];

  const originBits: string[] = [];
  if (exoplanet.discoveredYear) {
    originBits.push(`was reported in ${exoplanet.discoveredYear}`);
  }
  if (exoplanet.discoveryMethod && exoplanet.discoveryMethod !== "Unknown") {
    originBits.push(`was detected with the ${exoplanet.discoveryMethod} method`);
  }

  if (exoplanet.hostStar && exoplanet.hostStar !== "Unknown") {
    sentences.push(
      `${exoplanet.displayName} orbits ${exoplanet.hostStar}${
        originBits.length > 0 ? ` and ${joinWithAnd(originBits)}` : ""
      }.`
    );
  } else if (originBits.length > 0) {
    sentences.push(`${exoplanet.displayName} ${joinWithAnd(originBits)}.`);
  }

  const measurementBits: string[] = [];
  if (typeof exoplanet.radiusEarth === "number") {
    measurementBits.push(
      `a radius of ${formatDecimal(exoplanet.radiusEarth, 2)} Earth radii`
    );
  }
  if (typeof exoplanet.massEarth === "number") {
    measurementBits.push(
      `a mass of ${formatDecimal(exoplanet.massEarth, 2)} Earth masses${
        exoplanet.massIsEstimated ? " (estimated)" : ""
      }`
    );
  }
  if (typeof exoplanet.orbitalPeriodDays === "number") {
    measurementBits.push(
      `an orbital period of ${formatDecimal(exoplanet.orbitalPeriodDays, 2)} days`
    );
  }
  if (typeof exoplanet.equilibriumTempK === "number") {
    measurementBits.push(
      `an equilibrium temperature near ${formatDecimal(exoplanet.equilibriumTempK, 0)} K`
    );
  }

  if (measurementBits.length > 0) {
    sentences.push(
      `Published measurements list ${joinWithAnd(measurementBits)}.`
    );
  }

  const systemBits: string[] = [];
  if (typeof exoplanet.distanceParsecs === "number") {
    systemBits.push(
      `the system at about ${formatDecimal(exoplanet.distanceParsecs, 1)} parsecs from Earth`
    );
  }
  if (exoplanet.spectralType) {
    systemBits.push(`a host star classified as ${exoplanet.spectralType}`);
  }
  if (typeof exoplanet.planetsInSystem === "number" && exoplanet.planetsInSystem > 0) {
    systemBits.push(
      `${formatDecimal(exoplanet.planetsInSystem, 0)} known planet${
        exoplanet.planetsInSystem === 1 ? "" : "s"
      } in the system`
    );
  }

  if (systemBits.length > 0) {
    sentences.push(`Catalog data places ${joinWithAnd(systemBits)}.`);
  }

  return sentences;
}

export function getRelatedExoplanets(
  planets: ExoplanetData[],
  currentId: string,
  limit = 8
): ExoplanetData[] {
  return planets
    .filter((planet) => planet.id !== currentId)
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .slice(0, limit);
}
