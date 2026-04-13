export interface CatalogEducationBlock {
  title: string;
  explanation: string;
  impact: string;
}

export const CATALOG_EDUCATION = {
  exoplanets: {
    title: "How to read exoplanet data",
    explanation:
      "Most exoplanet entries are incomplete because not every planet is measured the same way. Transit discoveries usually give you radius, radial-velocity detections usually give you mass, and only a subset have both. Habitability-style filters are best treated as rough screening tools, not proof of Earth-like conditions.",
    impact:
      "Use this page to compare discovery method, size category, distance, and host-star context together. The most reliable pattern is relative comparison: which planets are larger, hotter, farther, or better characterized than others.",
  },
  stars: {
    title: "How to read host star data",
    explanation:
      "These stars are shown because they host confirmed exoplanets. Spectral class tells you broad temperature and color, V magnitude tells you apparent brightness from Earth, and parsecs measure distance. Planet count reflects confirmed planets in the archive, not necessarily the final architecture of the system.",
    impact:
      "This makes the page useful for comparing stellar environments around known planets. Filtering by spectral class, distance, and planet count helps you quickly separate Sun-like systems from hotter, cooler, brighter, or more planet-rich hosts.",
  },
  "small-bodies": {
    title: "How to read small-body hazard labels",
    explanation:
      "NEO means the orbit can come relatively close to Earth. PHA means the object is both close enough and large enough to deserve extra monitoring. Neither label means an impact is expected. Orbit class describes the object's dynamical family, while size is often estimated indirectly from brightness rather than directly measured.",
    impact:
      "The best use of this page is triage: filter by asteroid vs comet, orbit class, NEO, and PHA to narrow the catalog quickly, then open detail pages for the objects whose orbit and size estimates matter most to you.",
  },
  fireballs: {
    title: "How to read fireball reports",
    explanation:
      "Fireball entries are observational event reports, not a complete census of everything entering the atmosphere. Energy estimates are modeled from brightness, and location, altitude, and velocity are only available when the event was observed well enough to reconstruct those values.",
    impact:
      "That means missing fields are normal. Use the filters to focus on better-characterized events when you want trajectory context, and treat the catalog as a record of notable observed impacts rather than a live hazard dashboard.",
  },
  "close-approaches": {
    title: "How to read close-approach risk data",
    explanation:
      "A close approach is a predicted flyby, not an impact warning. Distance is shown in lunar distances for intuition, relative velocity is the encounter speed, and absolute magnitude (H) is a brightness-based proxy for size. PHA is a monitoring classification based on orbit and estimated size, not a statement of imminent danger.",
    impact:
      "This page is most useful for ranking flybys by how close, how fast, and how large they might be. Use the highlight cards and filters to separate routine passes from the small set of events that are especially close or worth extra context.",
  },
} as const satisfies Record<string, CatalogEducationBlock>;

export type CatalogEducationKey = keyof typeof CATALOG_EDUCATION;
