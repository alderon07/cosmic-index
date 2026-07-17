import { AnyCosmicObject, isExoplanet, isSmallBody, isStar } from "@/lib/types";

export interface FactVizEntry {
  percent: number;
  minLabel: string;
  maxLabel: string;
}

function clampPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const normalized = ((value - min) / (max - min)) * 100;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
}

function logPercent(value: number, min: number, max: number): number {
  if (value <= 0 || min <= 0 || max <= min) return 0;
  const normalized =
    ((Math.log10(value) - Math.log10(min)) /
      (Math.log10(max) - Math.log10(min))) *
    100;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
}

function entry(
  percent: number,
  minLabel: string,
  maxLabel: string,
): FactVizEntry {
  return { percent, minLabel, maxLabel };
}

/**
 * Computes visualisation data for known numeric key-fact labels.
 * Each entry includes a 0-100 percentage and human-readable range labels
 * so the bar is self-explanatory. Facts without a meaningful scale
 * (categorical, text-only) are omitted.
 */
export function computeFactViz(
  object: AnyCosmicObject,
): Map<string, FactVizEntry> {
  const viz = new Map<string, FactVizEntry>();

  if (isExoplanet(object)) {
    if (object.radiusEarth != null)
      viz.set(
        "Radius",
        entry(clampPercent(object.radiusEarth, 0, 15), "0", "15 R⊕"),
      );
    if (object.massEarth != null) {
      const e = entry(clampPercent(object.massEarth, 0, 500), "0", "500 M⊕");
      viz.set("Mass", e);
      viz.set("Mass (est.)", e);
      viz.set("Minimum Mass (M sin i)", e);
    }
    if (object.orbitalPeriodDays != null)
      viz.set(
        "Orbital Period",
        entry(
          logPercent(object.orbitalPeriodDays, 0.1, 10_000),
          "0.1d",
          "10,000d",
        ),
      );
    if (object.distanceParsecs != null)
      viz.set(
        "Distance",
        entry(
          logPercent(object.distanceParsecs, 0.1, 10_000),
          "Nearby",
          "10,000 pc",
        ),
      );
    if (object.equilibriumTempK != null)
      viz.set(
        "Equilibrium Temp",
        entry(
          clampPercent(object.equilibriumTempK, 150, 3500),
          "150 K",
          "3,500 K",
        ),
      );
  }

  if (isStar(object)) {
    if (object.starTempK != null)
      viz.set(
        "Temperature",
        entry(
          clampPercent(object.starTempK, 2000, 40_000),
          "2,000 K",
          "40,000 K",
        ),
      );
    if (object.starMassSolar != null)
      viz.set(
        "Mass",
        entry(clampPercent(object.starMassSolar, 0.1, 10), "0.1 M☉", "10 M☉"),
      );
    if (object.planetCount > 0)
      viz.set(
        "Planets",
        entry(clampPercent(object.planetCount, 0, 12), "0", "12+"),
      );
    if (object.distanceParsecs != null)
      viz.set(
        "Distance",
        entry(
          logPercent(object.distanceParsecs, 0.1, 10_000),
          "Nearby",
          "10,000 pc",
        ),
      );
  }

  if (isSmallBody(object)) {
    if (object.diameterKm != null)
      viz.set(
        "Diameter",
        entry(
          logPercent(object.diameterKm, 0.01, 1000),
          "0.01 km",
          "1,000 km",
        ),
      );
    if (object.absoluteMagnitude != null)
      viz.set(
        "Absolute Magnitude",
        entry(
          100 - clampPercent(object.absoluteMagnitude, 10, 30),
          "Dim",
          "Bright",
        ),
      );
  }

  return viz;
}
