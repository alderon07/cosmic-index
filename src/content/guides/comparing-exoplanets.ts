import type { GuideArticle } from "./types";
import snapshot from "../../../public/research/exoplanet-completeness-2026-10-14.json";

const number = (value: number) => value.toLocaleString("en-US");

export const comparingExoplanets: GuideArticle = {
  publishedAt: "2026-09-05",
  updatedAt: "2026-10-14",
  introduction:
    "Requiring a mass and radius sounds like a neutral way to compare planets. In a NASA archive snapshot of 6,445 default planet records, that choice retains only 1,420. It also raises the share discovered by transits from 74.2% to 95.7%. This investigation counts what the filter removes and explains why the remaining planets cannot represent every world in the catalog.",
  sections: [
    {
      id: "measurement-snapshot",
      title: "A complete pair of fields selects a different population",
      paragraphs: [
        "On October 14, 2026, we queried NASA's Planetary Systems table for one default solution per planet. Of 4,781 transit discoveries, 1,359 have both a qualifying radius and mass. Of 1,203 radial-velocity discoveries, only 25 do. These are availability counts in selected published solutions, not a ranking of discovery methods or scientific reliability.",
        "The filter keeps 28.4% of transit discoveries and 2.1% of radial-velocity discoveries. Across all methods it keeps 22.0% of the snapshot. Transit discoveries account for 1,359 of those 1,420 retained records, or 95.7%. A mass-radius plot made from this subset is therefore even more dominated by transit discoveries than the starting catalog.",
        "The mass column below uses reported mass, not minimum mass. The separate minimum-mass count can overlap with the mass count: a default record can contain both fields. Do not add these columns to count planets.",
      ],
      table: {
        caption: "Default PS solutions retrieved October 14, 2026; positive values with limit flag 0",
        headings: ["Discovery method", "Planets", "Radius", "Mass", "Both", "Minimum mass"],
        rows: snapshot.groups.map((group) => [group.method, ...[group.total, group.radius, group.mass, group.both, group.minimumMass].map(number)]),
      },
      sources: [{ label: "NASA Exoplanet Archive: parameter definitions and limit flags", href: "https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html" }],
    },
    {
      id: "counting-rules",
      title: "What the count includes, and what it cannot establish",
      paragraphs: [
        "The query selects pl_name, discoverymethod, pl_rade, pl_radelim, pl_masse, pl_masselim, pl_msinie, and pl_msinielim from ps where default_flag = 1. One row represents one planet's default parameter set. Duplicate planet names cause the analysis to fail rather than count multiple literature solutions as separate planets.",
        "A radius qualifies when pl_rade is positive and pl_radelim is 0. A mass qualifies when pl_masse is positive and pl_masselim is 0. Both conditions must hold in the same row for the paired count. Minimum mass uses pl_msinie and pl_msinielim separately. Nulls, zero or negative values, missing flags, upper limits, and lower limits do not qualify.",
        "This procedure counts reported parameters. It does not certify that every mass is directly measured, that a value has small uncertainty, or that a radius is independent of an evolutionary model. In particular, imaging and microlensing estimates have their own model assumptions. A populated field is a starting point for checking the paper, not a stamp of measurement quality.",
        "Choosing the default PS solution makes this a conservative view of availability in one selected solution. A value absent here may exist in another publication. The archive's composite table fills gaps using other solutions and can calculate missing masses or radii from a mass-radius relation. Its greater completeness answers a different question. Neither table is wrong because its count differs from the other.",
      ],
      sources: [
        { label: "NASA: how composite parameters are selected", href: "https://exoplanetarchive.ipac.caltech.edu/docs/pscp_about.html" },
        { label: "NASA: calculated values in the composite table", href: "https://exoplanetarchive.ipac.caltech.edu/docs/pscp_calc.html" },
      ],
    },
    {
      id: "selection-effects",
      title: "The missing values follow the observing method",
      paragraphs: [
        "A transit measures the loss of starlight when a planet crosses its star. That constrains the planet-to-star radius ratio, so a stellar radius estimate helps yield a planetary radius. It does not supply a mass on its own. The high radius count for transit discoveries and the smaller paired count are consistent with that distinction.",
        "Radial velocity measures a star's motion along our line of sight. Without enough information about orbital inclination, the result constrains M sin i, a minimum mass. In this snapshot, 1,007 radial-velocity discoveries have qualifying minimum masses, compared with 226 with reported masses. A lack of qualifying radius says nothing about whether those planets are physically small.",
        "The discovery label describes how a planet was found, not every technique later used to study it. Follow-up can add a mass to a transit discovery or constrain inclination for a radial-velocity discovery. That is why the categories are not mutually exclusive sets of measurement techniques.",
        "The table also shows no qualifying radius for 292 microlensing discoveries in their default solutions. Reading that zero as 292 planets without size would be a category error. It means this table and these counting rules provide no eligible radius for them. Smaller groups deserve the same care: the three paired records among nine orbital-brightness discoveries do not establish a general 33% success rate.",
      ],
      sources: [{ label: "NASA: how exoplanets are found and characterized", href: "https://science.nasa.gov/exoplanets/how-we-find-and-characterize/" }],
    },
    {
      id: "density-limits",
      title: "A calculable density is not a measured composition",
      paragraphs: [
        "For a spherical planet, density relative to Earth is mass in Earth masses divided by radius in Earth radii cubed. A hypothetical planet with mass 8 and radius 2 has relative density 8 / 2³ = 1. A planet with mass 2 and radius 2 has relative density 0.25. The same radius can describe different bulk densities.",
        "Radius uncertainty matters because it is cubed. Holding mass fixed, increasing radius by 10% changes density by a factor of 1 / 1.1³, about 0.75. Decreasing radius by 10% changes it by 1 / 0.9³, about 1.37. These are sensitivity calculations, not confidence intervals. They show why a single decimal density can hide a much wider range of interpretations.",
        "Substituting M sin i gives a lower-bound mass contribution to density if the radius is held fixed. Substituting a mass estimated from radius builds the assumed relation back into the result. Neither operation supplies an independent composition measurement. Check parameter provenance and joint uncertainties before interpreting a point on a mass-radius plot.",
        "Habitability needs still more evidence. Orbital period and host-star properties help describe irradiation, but a familiar radius or a habitable-zone label does not establish surface water. The completeness filter selects which comparisons you can calculate. It cannot select which planets support life.",
      ],
      sources: [{ label: "NASA: what the habitable zone does and does not tell us", href: "https://science.nasa.gov/exoplanets/habitable-zone/" }],
    },
    {
      id: "reproduce-analysis",
      title: "Reproduce the calculation without confusing versions",
      paragraphs: [
        "The query and dated summary are available above. Group rows by discoverymethod, apply the eligibility rules, and divide each paired count by its group's total. Sum paired counts to obtain 1,420, then divide 1,359 by 1,420 to recover the transit share after filtering. Divide 4,781 by 6,445 for the starting share.",
        "The repository script scripts/analyze-exoplanet-completeness.ts performs one bounded archive request, validates the rows, and prints a candidate summary. Run it with bun scripts/analyze-exoplanet-completeness.ts. It does not replace the published snapshot. The recorded response fingerprint identifies the exact response used, but the downloadable summary does not preserve the original individual rows.",
        "A later query can return different counts when NASA adds planets or changes default solutions. Record your retrieval time and compare methods and flags before interpreting any difference as a scientific trend. The live Cosmic Index catalog uses its own ingestion schedule and composite fields, so its total need not equal this direct PS snapshot.",
      ],
      sources: [{ label: "NASA: retrieving archive data with TAP", href: "https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html" }],
    },
  ],
  takeaway:
    "Choose two planets in the catalog and record the discovery method, mass provenance, radius, and uncertainties before comparing them. State which missing or bounded values would exclude each planet from this analysis. Keep that selection rule beside your conclusion so readers know which worlds your comparison leaves out.",
};
