// Keep article bodies out of client bundles that only need navigation metadata.
export const GUIDES = [
  {
    slug: "comparing-exoplanets",
    title: "Compare exoplanets without mistaking size for habitability",
    description:
      "Work through radius, mass, and orbital period comparisons, then check what the measurements leave unanswered.",
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
] as const;

export type GuideSlug = (typeof GUIDES)[number]["slug"];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}
