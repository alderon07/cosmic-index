import type { ExoplanetData } from "@/lib/types";

type Measurements = Pick<
  ExoplanetData,
  | "radiusEarth"
  | "orbitalPeriodDays"
  | "massEarth"
  | "massIsEstimated"
  | "planetaryParameters"
  | "equilibriumTempK"
>;

interface Interpretation {
  id: "size" | "orbit" | "mass" | "temperature";
  title: string;
  text: string;
}

function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const format = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 3 });

function describeMass(planet: Measurements): string {
  const minimum = planet.planetaryParameters?.massProvenance === "Msini";
  const limit = planet.planetaryParameters?.massEarth?.limit;
  if (limit) {
    const quantity = minimum ? "M sin i" : "mass";
    const bound = limit === "upper" ? "an upper" : "a lower";
    return `The reported ${quantity} has ${bound} bound. Treat it as a constraint on that quantity, not an exact measurement.${minimum ? " The unknown viewing angle still affects the true mass." : " Check the source and uncertainty before comparing it with another record."}`;
  }
  if (minimum) {
    return "M sin i is a lower bound on the true mass because the viewing angle affects the radial-velocity measurement. Do not treat it as an exact mass or use it to claim a measured density.";
  }
  if (planet.massIsEstimated) {
    return "This mass is estimated. Check the source method before combining it with the radius: an inferred mass does not provide independent confirmation of the planet's composition.";
  }
  return "Mass describes how much material the planet contains. Inspect the published uncertainty and reference before combining it with a radius to estimate density. Catalog values can come from different studies.";
}

// Bounded calculations using the loaded record; no upstream requests or claims
// about composition, habitability, or measured surface conditions.
export function buildExoplanetInterpretation(
  planet: Measurements,
): Interpretation[] {
  const notes: Interpretation[] = [];
  if (isPositiveFinite(planet.radiusEarth)) {
    const volume = planet.radiusEarth ** 3;
    if (isPositiveFinite(volume)) {
      notes.push({
        id: "size",
        title: "Size in perspective",
        text: `At the reported radius, a spherical model gives about ${format.format(volume)} times Earth's volume. This is the radius ratio cubed, not a mass comparison. The radius alone cannot establish whether this world has a rocky surface or a thick gaseous envelope.`,
      });
    }
  }
  if (
    isPositiveFinite(planet.orbitalPeriodDays) &&
    !planet.planetaryParameters?.orbitalPeriodDays?.limit
  ) {
    const longOrbit = planet.orbitalPeriodDays >= 365.25;
    const ratio = longOrbit
      ? planet.orbitalPeriodDays / 365.25
      : 365.25 / planet.orbitalPeriodDays;
    if (isPositiveFinite(ratio)) {
      notes.push({
        id: "orbit",
        title: "A year on this world",
        text: `${longOrbit ? `One orbit lasts about ${format.format(ratio)} Earth years` : `A 365.25-day Earth year spans about ${format.format(ratio)} of these orbits`}. This comparison uses the reported orbital period. It does not measure the planet's rotation or the length of its day.`,
      });
    }
  }
  if (isPositiveFinite(planet.massEarth)) {
    notes.push({
      id: "mass",
      title: "What the mass can tell you",
      text: describeMass(planet),
    });
  }
  if (isPositiveFinite(planet.equilibriumTempK)) {
    notes.push({
      id: "temperature",
      title: "Temperature has limits",
      text: "Equilibrium temperature describes a model of absorbed and emitted energy, not a measured surface temperature. Atmosphere and reflectivity affect the interpretation. This value alone cannot establish liquid water, a habitable surface, or life.",
    });
  }
  return notes;
}
