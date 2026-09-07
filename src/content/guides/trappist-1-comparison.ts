import type { GuideArticle } from "./types";
import { TRAPPIST_PLANETS, TRAPPIST_SNAPSHOT_DATE } from "../trappist-comparison";

export const trappistComparison: GuideArticle = {
  updatedAt: TRAPPIST_SNAPSHOT_DATE,
  introduction: "TRAPPIST-1 b and e orbit the same star, yet their calendars look very different. In 30 Earth days, b completes about 20 orbits while e completes about five. Their radii differ by only about 21%. Work through that contrast here, then open the catalog to investigate the rest of the system.",
  sections: [
    {
      id: "source-snapshot",
      title: "Start with two records from the same system",
      paragraphs: [
        "NASA Science lists a radius of 1.116 Earth radii and a 1.5-day orbital period for TRAPPIST-1 b. For TRAPPIST-1 e, it lists 0.92 Earth radii and 6.1 days. These are the rounded source values checked on September 6, 2026. We retain this snapshot so the arithmetic below remains reproducible if a source later changes.",
        "Choosing planets around the same star holds the host-star identity constant. It does not make the planets interchangeable. We will compare radius and orbital period separately, without combining them into a habitability score. The small table below is enough to answer both questions.",
      ],
      table: {
        caption: "NASA Science snapshot checked September 6, 2026; rounded inputs",
        headings: ["Planet", "Radius in Earth radii", "Orbital period in Earth days"],
        rows: TRAPPIST_PLANETS.map((planet) => [planet.name, String(planet.radiusEarth), String(planet.periodDays)]),
      },
      sources: TRAPPIST_PLANETS.map((planet) => ({ label: `NASA Science: ${planet.name}`, href: planet.source })),
    },
    {
      id: "radius-comparison",
      title: "A modest radius difference becomes a larger volume difference",
      paragraphs: [
        "Divide b's radius by e's radius: 1.116 ÷ 0.92 ≈ 1.21. Planet b therefore has about 1.21 times e's radius in this snapshot. Equivalently, its radius is about 21% larger. The diameter ratio is also 1.21, since both radii would be multiplied by two.",
        "For spherical models, the volume ratio is the radius ratio cubed: (1.116 ÷ 0.92)³ ≈ 1.78. That is about 78% more volume. Notice the denominator: this compares b with e, not either planet with Earth. Relative to Earth, b's spherical volume is about 1.39 and e's is about 0.78.",
        "A circle in the diagram shows a cross-section, not a volume. Its area grows with radius squared, so it cannot show the full three-dimensional difference. These calculations describe geometry. They do not identify a planet's atmosphere or surface materials.",
      ],
    },
    {
      id: "orbital-calendar",
      title: "Count years using elapsed time divided by orbital period",
      paragraphs: [
        "For a 30-day interval, b completes 30 ÷ 1.5 = 20 orbits. Planet e completes 30 ÷ 6.1 ≈ 4.9. A decimal orbit means a fraction of a revolution, not an extra completed year. Change the interval in the calculator to check a week or an Earth year.",
        "The relative pace stays the same: 6.1 ÷ 1.5 ≈ 4.1. Planet b completes about 4.1 orbits during one orbit of e. This uses rounded periods and is not a determination of an exact orbital resonance. It also cannot predict the date of a transit, which requires timing information beyond a period.",
        "A planet's year measures its motion around its star. Its day concerns rotation. Dividing these orbital periods does not tell us how often an observer on either world would see sunrise. Keep the term orbit attached to the result when you share it.",
      ],
    },
    {
      id: "repeat-with-catalog",
      title: "Repeat the comparison and account for differences",
      paragraphs: [
        "Open the two planet records linked below the calculator. Add them to Compare and inspect the orbital-period row. If the live archive shows more digits than the NASA Science summary, your calculation may differ slightly. Record which source and precision you used, rather than changing one number silently to force agreement.",
        "Follow the source references before combining mass and radius into a density. The NASA Exoplanet Archive composite table can combine values from different publications. A displayed mass can also be an estimate or a minimum mass. The provenance and uncertainty belong with the result, even when they make the table less tidy.",
        "Your supported conclusion is specific: in this dated snapshot, b is about 21% larger in radius and completes about four times as many orbits over the same interval. Whether either planet has surface water requires other evidence. A familiar size alone cannot settle that question.",
      ],
      sources: [
        { label: "NASA Exoplanet Archive: parameters and provenance", href: "https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html" },
        { label: "NASA: what the habitable zone means", href: "https://science.nasa.gov/exoplanets/habitable-zone/" },
      ],
    },
  ],
  takeaway: "Try a third TRAPPIST-1 planet. First predict whether its year will be longer or shorter than e's, then check its orbital period and calculate how many orbits fit into 30 Earth days. Save this guide to your reading list if you want to repeat the exercise later.",
};
