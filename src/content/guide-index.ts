// Keep article bodies out of client bundles that only need navigation metadata.
export const GUIDES = [
  {
    slug: "trappist-1-comparison",
    title: "TRAPPIST-1 b and e: similar sizes, different years",
    description: "Compare two real planets with a scale diagram, a month of orbital motion, and calculations you can reproduce from NASA data.",
    topic: "Exoplanets",
    toolHref: "/exoplanets?query=TRAPPIST-1",
    toolLabel: "Explore the TRAPPIST-1 planets",
  },
  {
    slug: "comparing-exoplanets",
    title: "Which exoplanets survive a mass-and-radius filter?",
    description:
      "Analyze 6,445 NASA default records to see how missing measurements change a planet comparison, with counts, a chart, and a reproducible query.",
    topic: "Exoplanets",
    toolHref: "/exoplanets",
    toolLabel: "Open the exoplanet catalog",
  },
  {
    slug: "reading-space-weather",
    title: "Follow a space-weather event from the Sun to Earth",
    description:
      "Connect solar events, upstream measurements, and geomagnetic activity without confusing an observation with a forecast.",
    topic: "Space weather",
    toolHref: "/space-weather",
    toolLabel: "Open the space-weather observatory",
  },
  {
    slug: "understanding-asteroid-flybys",
    title: "Read an asteroid flyby without turning it into an impact warning",
    description:
      "Put lunar distances, size estimates, and hazard labels in context with a worked encounter comparison.",
    topic: "Small bodies",
    toolHref: "/close-approaches",
    toolLabel: "Explore close approaches",
  },
  {
    slug: "2023-bu-close-approach",
    title: "2023 BU: reconstruct a close-approach forecast",
    description:
      "Convert a reported surface clearance into a geocentric distance, then see why the reference point and source date belong with the number.",
    topic: "Investigation / Small bodies",
    toolHref: "/small-bodies?query=2023%20BU",
    toolLabel: "Find 2023 BU in the small-body catalog",
  },
  {
    slug: "may-2024-geomagnetic-storm",
    title: "May 2024: from solar eruptions to a G5 storm",
    description:
      "Reconstruct the arrival and escalation of the May 2024 storm, compare source timestamps, and separate physical evidence from event associations.",
    topic: "Investigation / Space weather",
    toolHref: "/space-weather/events",
    toolLabel: "Explore space-weather events",
  },
] as const;

export type GuideSlug = (typeof GUIDES)[number]["slug"];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}
