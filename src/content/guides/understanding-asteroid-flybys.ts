import type { GuideArticle } from "./types";

export const understandingAsteroidFlybys: GuideArticle = {
  introduction:
    "A close-approach table is a list of predicted encounters. Distance, speed, size, and monitoring classification answer different questions. Reading them separately helps you describe an interesting flyby without making an unsupported claim about impact risk.",
  sections: [
    {
      id: "read-encounter",
      title: "Read one encounter before ranking the list",
      paragraphs: [
        "Open Close Approaches and choose an encounter. Record the object designation, encounter time, nominal distance, and relative velocity. Check the displayed time zone. Open the object's detail record when available, then follow the JPL source for the orbit solution and any uncertainty information that the summary does not show.",
        "A lunar distance, abbreviated LD, is about 384,400 kilometres. It gives a familiar scale for separation. A predicted flyby distance is not the object's diameter, an altitude above Earth's surface, or the minimum distance between two orbital paths. Keep the encounter time attached to the distance whenever you share it.",
      ],
      sources: [
        {
          label: "JPL CNEOS: Earth close approaches and distance units",
          href: "https://cneos.jpl.nasa.gov/ca/",
        },
      ],
    },
    {
      id: "worked-distances",
      title: "Compare flybys without inventing a risk score",
      paragraphs: [
        "Consider these invented encounters. Object A passes at 2 LD and Object B at 5 LD. Multiplying by 384,400 converts those values to approximately 768,800 and 1,922,000 kilometres. Object A's nominal encounter is 2.5 times closer, because 5 divided by 2 is 2.5.",
        "The word nominal matters. This arithmetic compares the listed central estimates and does not incorporate orbital uncertainty. It also does not yield an impact probability. If Object B is larger or faster, that does not reverse which nominal encounter is closer. You need a separate, precisely stated question for each ranking.",
      ],
      table: {
        caption: "Illustrative encounters, not current predictions",
        headings: ["Encounter", "Nominal separation", "Approximate kilometres"],
        rows: [
          ["Object A", "2 LD", "768,800"],
          ["Object B", "5 LD", "1,922,000"],
        ],
      },
    },
    {
      id: "hazard-labels",
      title: "Separate orbital classification from an impact prediction",
      paragraphs: [
        "Near-Earth asteroids have orbits with perihelion below 1.3 astronomical units. That classification concerns an orbit, not an asteroid's location today. Potentially hazardous asteroid, or PHA, adds criteria involving Earth's minimum orbit intersection distance and the object's absolute magnitude. The standard thresholds are MOID at most 0.05 au and absolute magnitude H at most 22.",
        "MOID compares the geometry of two paths. It does not require the objects to occupy their closest points at the same time. A PHA label therefore does not predict a collision during the listed encounter. Use the label to understand why an object merits monitoring; keep any statement about a particular impact possibility tied to the current risk assessment.",
      ],
      sources: [
        {
          label: "JPL CNEOS: NEO groups and PHA criteria",
          href: "https://cneos.jpl.nasa.gov/about/neo_groups.html",
        },
      ],
    },
    {
      id: "size-and-uncertainty",
      title: "Keep size estimates and orbit uncertainty visible",
      paragraphs: [
        "Absolute magnitude H describes brightness under standardized conditions. Inferring diameter from brightness also requires an assumption about reflectivity. A dark object and a brighter-surfaced object can have the same H while having different diameters. When a record gives a size range, preserve the range instead of selecting its most dramatic endpoint.",
        "JPL's Sentry system evaluates possible impacts using orbit solutions and their uncertainties. New observations can change those solutions and the possible encounters they allow. A short catalog entry cannot replace that analysis. If you want to investigate risk, follow the current JPL assessment rather than constructing a probability from distance, velocity, and diameter.",
        "Return to your selected encounter and write one sentence using only supported claims: the named object has a predicted flyby at the listed time and nominal distance, with the reported size estimate. Add the PHA classification separately if present. That preserves the interesting information without suggesting that a monitoring label is an emergency notice.",
      ],
      sources: [
        {
          label: "JPL CNEOS: brightness and size assumptions",
          href: "https://cneos.jpl.nasa.gov/about/neo_groups.html",
        },
        {
          label: "JPL Sentry: how impact monitoring works",
          href: "https://cneos.jpl.nasa.gov/sentry/intro.html",
        },
      ],
    },
  ],
  takeaway:
    "Use Close Approaches to compare encounters and Small Bodies to inspect the objects behind them. Keep nominal distances, uncertainty, and monitoring labels distinct. Check JPL's current assessment for impact risk; this catalog is an exploration tool, not an impact-warning service.",
};
