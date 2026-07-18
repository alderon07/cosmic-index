import { BASE_URL } from "@/lib/config";
import type {
  ScientificMeasurement,
  StarData,
  StellarIdentifiers,
} from "@/lib/types";

interface SchemaPropertyValue {
  "@type": "PropertyValue";
  name: string;
  value: string;
  unitText?: string;
}

function property(name: string, value: string | number, unitText?: string): SchemaPropertyValue {
  return {
    "@type": "PropertyValue",
    name,
    value: String(value),
    ...(unitText ? { unitText } : {}),
  };
}

function measurementProperty(
  name: string,
  measurement: ScientificMeasurement | undefined,
  unitText: string,
): SchemaPropertyValue | null {
  return measurement ? property(name, measurement.value, unitText) : null;
}

function identifiersToJsonLd(identifiers: StellarIdentifiers) {
  const labels: Array<[keyof StellarIdentifiers, string]> = [
    ["hd", "HD"],
    ["hip", "HIP"],
    ["tic", "TIC"],
    ["gaiaDR2", "Gaia DR2"],
    ["gaiaDR3", "Gaia DR3"],
  ];

  return labels.flatMap(([key, propertyID]) => {
    const value = identifiers[key];
    return value
      ? [{ "@type": "PropertyValue" as const, propertyID, value }]
      : [];
  });
}

export function buildStarJsonLd(star: StarData, slug: string) {
  const additionalProperty: SchemaPropertyValue[] = [];

  if (star.spectralType) additionalProperty.push(property("Spectral Type", star.spectralType));
  if (star.planetCount > 0) additionalProperty.push(property("Known Planets", star.planetCount));
  if (star.distanceParsecs !== undefined) {
    additionalProperty.push(property("Distance", star.distanceParsecs.toFixed(1), "parsecs"));
  }
  if (star.starTempK !== undefined) {
    additionalProperty.push(property("Temperature", star.starTempK.toFixed(0), "Kelvin"));
  }
  if (star.starMassSolar !== undefined) {
    additionalProperty.push(property("Mass", star.starMassSolar.toFixed(2), "Solar masses"));
  }

  const parameters = star.stellarParameters;
  if (parameters) {
    const enrichedProperties = [
      measurementProperty("Parallax", parameters.parallaxMas, "milliarcseconds"),
      measurementProperty(
        "Total proper motion",
        parameters.properMotionMasPerYear,
        "milliarcseconds per year",
      ),
      parameters.coordinates.raDeg === undefined
        ? null
        : property("Right ascension", parameters.coordinates.raDeg, "degrees"),
      parameters.coordinates.decDeg === undefined
        ? null
        : property("Declination", parameters.coordinates.decDeg, "degrees"),
    ].filter((value): value is SchemaPropertyValue => value !== null);

    additionalProperty.push(...enrichedProperties);
    additionalProperty.push(property("Published stellar solutions", parameters.solutions.length));
    additionalProperty.push(property("Photometry measurements", parameters.photometry.length));
    additionalProperty.push(property("Elemental abundances", parameters.abundances.length));
    additionalProperty.push(property("Stellar parameter source", "NASA Exoplanet Archive"));
    if (parameters.systemReference) {
      additionalProperty.push(property("System reference", parameters.systemReference));
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Thing",
    additionalType: "https://schema.org/Thing",
    name: star.displayName,
    description: star.summary,
    url: `${BASE_URL}/stars/${slug}`,
    identifier: parameters ? identifiersToJsonLd(parameters.identifiers) : [],
    additionalProperty,
    sameAs: [
      `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(star.hostname)}`,
    ],
  };
}
