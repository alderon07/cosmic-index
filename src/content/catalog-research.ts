import type { GuideSection } from "./guides/types";

interface CatalogResearchNote {
  name: string;
  checkedAt: string;
  sections: GuideSection[];
}

export const CATALOG_RESEARCH: readonly CatalogResearchNote[] = [
  {
    name: "TRAPPIST-1 b",
    checkedAt: "2026-10-14",
    sections: [
      {
        id: "dayside-evidence",
        title: "An Earth-sized planet can have a very different dayside",
        paragraphs: [
          "TRAPPIST-1 b makes a useful counterexample to choosing Earth analogues by radius. NASA's 2023 Webb report describes a dayside brightness temperature of about 500 kelvin inferred from mid-infrared emission. The observation was a secondary eclipse: the planet passed behind its star, allowing researchers to isolate its contribution to the combined light.",
          "That temperature is not the catalog's equilibrium temperature, and it is not a global weather report. It comes from a particular wavelength range and viewing geometry. Comparing it directly with a model equilibrium temperature would mix an observation with an energy-balance assumption.",
          "The reported emission was consistent with little heat redistribution and argued against a substantial atmosphere in the models tested. That does not make radius a diagnostic for atmospheric loss. The atmospheric inference depends on emitted light and models; the radius comparison only establishes size.",
        ],
        sources: [{ label: "NASA, March 2023: Webb's thermal-emission measurement and interpretation", href: "https://science.nasa.gov/missions/webb/nasas-webb-measures-the-temperature-of-a-rocky-exoplanet/" }],
      },
      {
        id: "compare-b-and-e",
        title: "Use b as a comparison case, not a verdict on its neighbors",
        paragraphs: [
          "Our dated comparison uses rounded NASA values of 1.116 Earth radii and a 1.5-day period for b, versus 0.92 Earth radii and 6.1 days for e. The radius ratio is about 1.21 while the orbital-period ratio is about 4.1. Similar size therefore coexists with a large difference in orbital timescale around the same star.",
          "Holding the host star constant removes one difference, but it does not hold irradiation, atmosphere, or geological history constant. A result for b cannot be assigned to e merely because both planets are small. Check the observation type, wavelength, and model assumptions for each world before combining their results.",
        ],
        sources: [
          { label: "NASA Science: TRAPPIST-1 b", href: "https://science.nasa.gov/exoplanet-catalog/trappist-1-b/" },
          { label: "NASA Science: TRAPPIST-1 e", href: "https://science.nasa.gov/exoplanet-catalog/trappist-1-e/" },
        ],
      },
    ],
  },
  {
    name: "TRAPPIST-1 e",
    checkedAt: "2026-10-14",
    sections: [
      {
        id: "atmospheric-question",
        title: "A habitable-zone candidate still needs atmospheric evidence",
        paragraphs: [
          "TRAPPIST-1 e is a useful test of the gap between a promising target and an established Earth analogue. Its small radius and position in the system make atmospheric characterization interesting. Neither property demonstrates surface liquid water.",
          "NASA's system overview summarizes results available as of December 2025. It says thick hydrogen atmospheres have been ruled out for d and e, while their atmospheric interpretation remains under study. That is an exclusion of one family of models. It is not a detection of an Earth-like atmosphere or proof that e is bare rock.",
          "The same overview identifies stellar flares and spots as obstacles to separating planetary signals from the host star. A feature in transit data must survive checks for stellar contamination before it becomes evidence for an atmospheric constituent. More observations can help distinguish these explanations, but a longer observation campaign is not itself a detection.",
        ],
        sources: [{ label: "NASA: TRAPPIST-1 atmospheric evidence, summarizing results as of December 2025", href: "https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-is-webb-revealing-about-the-trappist-1-system/" }],
      },
      {
        id: "size-and-uncertainty",
        title: "What the comparison with b actually establishes",
        paragraphs: [
          "Using the retained rounded inputs in our comparison guide, e completes about 4.9 orbits in 30 Earth days while b completes 20. Planet e's spherical volume is about 0.78 Earth's when its radius is taken as 0.92 Earth radii. Those calculations establish relative geometry and orbital timing only.",
          "A density calculation would also need a mass and its uncertainty. Even a well-constrained bulk density permits different internal structures and does not identify the atmosphere. Keep the conclusions separate: size from radius, orbital timing from period, and atmospheric constraints from the relevant observations.",
          "These notes retain the source's stated evidence date. The live catalog can revise numerical fields independently, so a changed radius is not automatically a changed atmospheric conclusion. Follow the linked studies and their dates when assessing new claims about this planet.",
        ],
        sources: [{ label: "NASA Science: TRAPPIST-1 e catalog summary", href: "https://science.nasa.gov/exoplanet-catalog/trappist-1-e/" }],
      },
    ],
  },
];
