import type { GuideArticle } from "./types";

export const comparingExoplanets: GuideArticle = {
  introduction:
    "A useful planet comparison starts with a question you can answer from the measurements. Which world has a shorter year? Which has a larger measured radius? Whether either world could support life is a different question, and a catalog row rarely settles it. This walkthrough shows how to separate a calculation from an interpretation.",
  sections: [
    {
      id: "choose-records",
      title: "Choose records that answer the same question",
      paragraphs: [
        "Open the exoplanet catalog and choose two planets with reported radii and orbital periods. Add each to Compare from its card or detail page. If a field is missing, choose another record for that comparison. Missing mass does not mean a planet has little mass.",
        "Check the discovery method before comparing completeness. Transits detect a planet passing in front of its star. Radial velocity detects the star's motion under gravitational influence. These observations constrain different properties, so two equally real planets can have very different sets of known measurements.",
      ],
      sources: [
        {
          label: "NASA: how we find and characterize exoplanets",
          href: "https://science.nasa.gov/exoplanets/how-we-find-and-characterize/",
        },
      ],
    },
    {
      id: "worked-comparison",
      title: "Turn two measurements into a useful comparison",
      paragraphs: [
        "The following invented planets are a calculation exercise, not current catalog entries. World A has twice Earth's radius, while World B has Earth's radius. Treating both as spheres, their volume ratio is the radius ratio cubed: 2 × 2 × 2 = 8. World A therefore occupies eight times the volume of World B. That calculation says nothing about how much material fills the volume.",
        "Their orbital periods answer a separate question. During one 365.25-day Earth year, World A completes about 36.5 orbits and World B about 18.3. World A's year is half as long. These are orbital years; neither number gives the length of a day on the planet.",
      ],
      table: {
        caption: "Illustrative worlds with exact inputs for this exercise",
        headings: ["Measurement", "World A", "World B"],
        rows: [
          ["Radius in Earth radii", "2", "1"],
          ["Volume relative to Earth, spherical model", "8", "1"],
          ["Orbital period", "10 days", "20 days"],
          ["Orbits per 365.25-day Earth year", "36.5", "18.3"],
        ],
      },
    },
    {
      id: "check-mass",
      title: "Read the mass label before drawing conclusions",
      paragraphs: [
        "A minimum mass labelled M sin i depends on how the orbit is tilted toward us. It is a lower bound on the true mass, not an interchangeable measurement. An estimated mass also needs a different interpretation from a direct observational constraint. Cosmic Index preserves these labels so that a neat comparison table does not erase the distinction.",
        "For real objects, inspect the parameter uncertainties and follow the Data Sources links before using the numbers in a calculation. The archive's composite table combines published values and is not necessarily a single self-consistent solution. A density computed from two displayed values can look precise while mixing incompatible assumptions. Record the source and uncertainty with your result.",
      ],
      sources: [
        {
          label:
            "NASA Exoplanet Archive: table definitions and mass provenance",
          href: "https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html",
        },
      ],
    },
    {
      id: "stellar-context",
      title: "Bring the host star into the comparison",
      paragraphs: [
        "Open the host-star record from System Context when it is available. Compare the stellar environment before treating a short year as evidence that a planet is hot. The distance at which liquid surface water might persist depends on the star's luminosity. A region suitable around a dim star can be much closer to that star than the equivalent region around a brighter one.",
        "A habitable-zone label does not establish an atmosphere, surface water, or life. Similarly, equilibrium temperature is a model quantity, not a measured surface temperature. Use those fields to choose questions for further reading, and keep an explicit list of what remains unknown about your two planets.",
      ],
      sources: [
        {
          label: "NASA: the habitable zone",
          href: "https://science.nasa.gov/exoplanets/habitable-zone/",
        },
        {
          label: "NASA Exoplanet Archive: planetary parameter definitions",
          href: "https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html",
        },
      ],
    },
  ],
  takeaway:
    "Write a conclusion that names both the result and its limit: World A has a larger measured radius and a shorter orbital period than World B. Their surface conditions remain unresolved. Repeat the comparison with catalog records, retaining their measurement labels and uncertainties.",
};
