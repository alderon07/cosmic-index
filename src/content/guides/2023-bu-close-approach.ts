import type { GuideArticle } from "./types";

export const asteroid2023BuCloseApproach: GuideArticle = {
  publishedAt: "2026-09-08",
  introduction:
    "A January 2023 NASA/JPL forecast placed asteroid 2023 BU about 3,600 kilometers above Earth's surface at closest approach. Close-approach tables usually measure from Earth's center. This investigation converts between those reference points and shows why a precise-looking lunar-distance value can overstate the source precision.",
  sections: [
    {
      id: "forecast-snapshot",
      title: "Freeze the forecast before doing the arithmetic",
      paragraphs: [
        "On January 25, 2023, NASA/JPL reported that 2023 BU was expected to make its closest approach on January 26 at 4:27 p.m. PST, or January 27 at 00:27 UTC. The forecast put the asteroid about 3,600 kilometers above Earth's surface. JPL estimated a diameter of 3.5 to 8.5 meters and said its assessment found no risk of impact.",
        "Those values describe a forecast published before the encounter. They are not a post-encounter orbit solution. Keep the publication date, expected timestamp, approximation marks, and reference point attached to the numbers.",
      ],
      table: {
        caption: "NASA/JPL forecast published January 25, 2023",
        headings: ["Field", "Reported value", "How this investigation uses it"],
        rows: [
          ["Expected closest approach", "Jan. 27, 2023, 00:27 UTC", "Event label, not a current catalog timestamp"],
          ["Surface clearance", "About 3,600 km", "Rounded altitude above Earth's surface"],
          ["Estimated diameter", "3.5 to 8.5 m", "Size range, not a measured single diameter"],
        ],
      },
      sources: [
        {
          label: "NASA/JPL: 2023 BU close-approach forecast, January 25, 2023",
          href: "https://www.jpl.nasa.gov/news/nasa-system-predicts-small-asteroid-to-pass-close-by-earth-this-week/",
        },
      ],
    },
    {
      id: "change-the-origin",
      title: "Add Earth's radius before using lunar distance",
      paragraphs: [
        "Use a spherical Earth with a radius of 6,371 kilometers. The estimated distance from Earth's center is 3,600 + 6,371 = 9,971 kilometers. That is about 1.57 Earth radii from the center, while the surface clearance alone is about 0.57 Earth radii.",
        "NASA gives the Moon's average distance as 384,400 kilometers. Divide the geocentric distance by that value: 9,971 ÷ 384,400 ≈ 0.0259 lunar distances. Dividing the altitude instead gives 3,600 ÷ 384,400 ≈ 0.00937. The smaller result answers a different question because its starting point is Earth's surface.",
        "The diagram enlarges the asteroid so it remains visible. Earth's radius and the surface clearance use one linear scale. The flyby's orientation is illustrative, and the diagram does not reproduce its path.",
      ],
      sources: [
        {
          label: "NASA: Earth radius used for the spherical approximation",
          href: "https://science.nasa.gov/moon/by-the-numbers/",
        },
        {
          label: "NASA: average distance between Earth and Moon",
          href: "https://science.nasa.gov/moon/facts/",
        },
      ],
    },
    {
      id: "precision-and-catalogs",
      title: "Do not manufacture precision from a rounded report",
      paragraphs: [
        "The inputs 3,600 and 6,371 kilometers produce 9,971 in a calculator, but the forecast said about 3,600. Report the result as about 10,000 kilometers from Earth's center or about 0.026 lunar distances. Extra decimal places help audit the arithmetic, not improve the source measurement.",
        "JPL's close-approach API documents encounter time in TDB and distance in astronomical units. A current API row may use a later orbit solution and a different time standard than the news report. Compare the source version, time standard, distance origin, and units before calling two values inconsistent.",
        "The supported conclusion is narrow. Using the forecast's rounded surface clearance and a spherical Earth, the corresponding geocentric distance is about 0.026 times the average distance between Earth and Moon. This calculation does not update the orbit or measure the actual encounter after the fact.",
      ],
      sources: [
        {
          label: "JPL: close-approach data API fields and units",
          href: "https://ssd-api.jpl.nasa.gov/doc/cad.html",
        },
      ],
    },
  ],
  takeaway:
    "Open 2023 BU in the small-body catalog if the record is available. Compare its displayed size range and source links with this January 25, 2023 forecast. Use JPL's close-approach data for encounter fields, and retain that source's time standard and units.",
};
