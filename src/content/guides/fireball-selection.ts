import snapshot from "../../../public/research/fireballs-2025-retrieved-2026-10-14.json";
import { summarizeFireballs } from "@/lib/editorial/fireball-completeness";
import type { GuideArticle } from "./types";

const counts = summarizeFireballs(snapshot);
const percent = (count: number) => `${(100 * count / counts.total).toFixed(1)}%`;

export const fireballSelection: GuideArticle = {
  publishedAt: "2026-10-14",
  introduction: "A filter for better-documented fireballs also changes which events you study. We retained the CNEOS records dated in 2025 and counted what remains when location, altitude, or entry velocity components are required. In this snapshot, the velocity requirement removes one-third of the reported events. A location requirement removes none.",
  sections: [
    {
      id: "retained-sample",
      title: "Start with a dated sample, not the live result counter",
      paragraphs: [
        "We retrieved the NASA/JPL Fireball Data API on October 14, 2026, using January 1, 2025 at 00:00:00 through December 31, 2025 at 23:59:59. Dates refer to peak brightness in GMT. The request includes velocity components, sorts by date, and has no result limit or required-field filters.",
        `The response contains ${counts.total} records. This is not a complete census of fireballs on Earth. CNEOS explicitly says its list is incomplete and includes only the brightest events. Our denominator is the returned catalog sample, not all meteors, all detected events, or all events that occurred in 2025.`,
        "The downloadable JSON retains every returned row, the field names, and the API version. A future request can return revised records. Use the retained file to reproduce this article, and a new dated snapshot to investigate later changes.",
      ],
      sources: [
        { label: "JPL Fireball API: date bounds, field selection, and output format", href: "https://ssd-api.jpl.nasa.gov/doc/fireball.html" },
        { label: "CNEOS: the fireball list is incomplete", href: "https://cneos.jpl.nasa.gov/fireballs/intro.html" },
      ],
    },
    {
      id: "filter-results",
      title: "The velocity requirement removes 11 records",
      paragraphs: [
        "We count a location only when latitude, longitude, and both hemisphere fields are present. Altitude requires a reported value. Velocity requires all three entry components, vx, vy, and vz. Zero is a valid component or coordinate, not a missing value. Null means that the field is not reported.",
        `${counts.velocity} of ${counts.total} records retain complete velocity components, or ${percent(counts.velocity)}. All ${counts.total} retain location and altitude. Requiring all three groups therefore leaves the same ${counts.all} records as requiring velocity alone. The requirements overlap, so their excluded counts must not be added together.`,
        "This result does not establish that events without velocity are slower, weaker, or less important. It establishes missingness in one year's published records. Inferring a physical difference would require another analysis and a defensible account of how measurements enter the catalog.",
      ],
      table: {
        caption: "Independent requirements applied to the retained 2025 sample",
        headings: ["Requirement", "Retained", "Excluded", "Share retained"],
        rows: [
          ["None", counts.total], ["Location", counts.location], ["Altitude", counts.altitude],
          ["All velocity components", counts.velocity], ["Location, altitude, and velocity components", counts.all],
        ].map(([label, count]) => [String(label), String(count), String(counts.total - Number(count)), percent(Number(count))]),
      },
    },
    {
      id: "inspect-two-records",
      title: "Check the missing fields against real rows",
      paragraphs: [
        "The February 2 event at 16:30:50 has a reported position of 17.7 degrees south, 24.3 degrees east and an altitude of 40.0 km. Its three velocity components are null. It survives a location filter but disappears when all velocity components are required.",
        "The January 10 event at 21:11:07 has components of -7.1, -8.0, and -9.0 km/s. Their vector magnitude is approximately 14.0 km/s. The negative signs describe directions along axes, not negative speed. Component availability does not provide an uncertainty estimate, a reconstructed orbit, or the velocity before atmospheric slowing.",
        "The snapshot also includes a scalar vel field. This study deliberately uses the documented component fields. JPL's version history removed the old pre-entry-speed terminology. When comparing an older table or application with this study, check both the field definition and the API version rather than treating every column called velocity as interchangeable.",
      ],
      sources: [{ label: "JPL: entry velocity components and API version history", href: "https://ssd-api.jpl.nasa.gov/doc/fireball.html" }],
    },
    {
      id: "energy-is-not-speed",
      title: "Keep radiated energy separate from estimated impact energy",
      paragraphs: [
        "The January 10 row reports energy 2.7 and impact-e 0.095. The first means approximately 2.7 × 10^10 joules of radiated energy. The second means approximately 0.095 kilotons of estimated total impact energy. The raw numbers cannot be compared without their units and definitions.",
        "Using CNEOS's stated conversion of 4.185 × 10^12 joules per kiloton, the radiated value is about 0.00645 kilotons. CNEOS describes an empirical relation, E = 8.2508 × Eo^0.885, to estimate total impact energy from optical radiant energy, with both inputs expressed in kilotons. Applying it gives about 0.095 kilotons, consistent with the published row after rounding.",
        "That agreement checks the calculation. It does not turn the impact-energy estimate into an independent measurement or tell us how much material reached the ground. An event can retain energy estimates even when velocity components are absent.",
      ],
      sources: [{ label: "CNEOS: radiated energy, kiloton conversion, and empirical impact-energy relation", href: "https://cneos.jpl.nasa.gov/fireballs/intro.html" }],
    },
  ],
  takeaway: "Open the fireball catalog and inspect what each required-field control excludes. The live browser uses its own result window and may contain newer records, so its counts need not match this retained 2025 sample. Use the JSON download above for the exact 33-row analysis. A missing field is not a zero measurement, and an empty filtered view does not mean no fireballs occurred.",
};
