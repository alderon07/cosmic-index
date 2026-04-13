import { BASE_URL, SITE_CONFIG } from "@/lib/config";
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

function truncateAtWordBoundary(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength - 1);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  if (lastSpaceIndex >= Math.floor(maxLength * 0.6)) {
    return `${truncated.slice(0, lastSpaceIndex)}…`;
  }

  return `${truncated}…`;
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

export function buildExoplanetMetaDescription(exoplanet: ExoplanetData) {
  const segments: string[] = [];

  segments.push(
    `${exoplanet.displayName} is an exoplanet${
      exoplanet.hostStar && exoplanet.hostStar !== "Unknown"
        ? ` orbiting ${exoplanet.hostStar}`
        : ""
    }.`
  );

  if (exoplanet.discoveredYear || exoplanet.discoveryMethod !== "Unknown") {
    const discoveryBits: string[] = [];
    if (exoplanet.discoveredYear) {
      discoveryBits.push(`reported in ${exoplanet.discoveredYear}`);
    }
    if (exoplanet.discoveryMethod && exoplanet.discoveryMethod !== "Unknown") {
      discoveryBits.push(`via ${exoplanet.discoveryMethod}`);
    }
    segments.push(`${joinWithAnd(discoveryBits)}.`);
  }

  const measurements: string[] = [];
  if (typeof exoplanet.radiusEarth === "number") {
    measurements.push(`${formatDecimal(exoplanet.radiusEarth, 2)} Earth radii`);
  }
  if (typeof exoplanet.orbitalPeriodDays === "number") {
    measurements.push(`${formatDecimal(exoplanet.orbitalPeriodDays, 2)} day orbit`);
  }
  if (typeof exoplanet.distanceParsecs === "number") {
    measurements.push(`${formatDecimal(exoplanet.distanceParsecs, 1)} pc away`);
  }

  if (measurements.length > 0) {
    segments.push(`Known values include ${joinWithAnd(measurements)}.`);
  }

  return truncateAtWordBoundary(segments.join(" "), 158);
}

export function buildExoplanetJsonLd(exoplanet: ExoplanetData, slug: string) {
  const url = `${BASE_URL}/exoplanets/${slug}`;
  const description = buildExoplanetMetaDescription(exoplanet);
  const additionalProperties = [];

  if (exoplanet.hostStar && exoplanet.hostStar !== "Unknown") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Host Star",
      value: exoplanet.hostStar,
    });
  }

  if (exoplanet.discoveryMethod && exoplanet.discoveryMethod !== "Unknown") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Discovery Method",
      value: exoplanet.discoveryMethod,
    });
  }

  if (typeof exoplanet.radiusEarth === "number") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Radius",
      value: exoplanet.radiusEarth.toFixed(2),
      unitText: "Earth radii",
    });
  }

  if (typeof exoplanet.massEarth === "number") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: exoplanet.massIsEstimated ? "Mass (estimated)" : "Mass",
      value: exoplanet.massEarth.toFixed(2),
      unitText: "Earth masses",
    });
  }

  if (typeof exoplanet.orbitalPeriodDays === "number") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Orbital Period",
      value: exoplanet.orbitalPeriodDays.toFixed(2),
      unitText: "days",
    });
  }

  if (typeof exoplanet.distanceParsecs === "number") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Distance",
      value: exoplanet.distanceParsecs.toFixed(1),
      unitText: "parsecs",
    });
  }

  if (typeof exoplanet.discoveredYear === "number") {
    additionalProperties.push({
      "@type": "PropertyValue",
      name: "Discovery Year",
      value: exoplanet.discoveredYear.toString(),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: `${exoplanet.displayName} | ${SITE_CONFIG.name}`,
        description,
        isPartOf: {
          "@type": "WebSite",
          name: SITE_CONFIG.name,
          url: BASE_URL,
        },
        about: {
          "@id": `${url}#exoplanet`,
        },
      },
      {
        "@type": "Thing",
        "@id": `${url}#exoplanet`,
        name: exoplanet.displayName,
        description: exoplanet.summary,
        disambiguatingDescription: "Exoplanet catalog record in Cosmic Index.",
        url,
        mainEntityOfPage: {
          "@id": `${url}#webpage`,
        },
        identifier: exoplanet.sourceId,
        additionalType: "https://schema.org/Thing",
        ...(exoplanet.aliases.length > 0
          ? { alternateName: exoplanet.aliases }
          : {}),
        additionalProperty: additionalProperties,
        sameAs: [
          `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(
            exoplanet.sourceId
          )}`,
        ],
      },
    ],
  };
}
