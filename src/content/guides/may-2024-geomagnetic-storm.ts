import type { GuideArticle } from "./types";

export const may2024GeomagneticStorm: GuideArticle = {
  publishedAt: "2026-09-08",
  introduction:
    "During May 2024, forecasts, geomagnetic observations, and new solar eruptions arrived close together. A clean timeline prevents a later flare from becoming the cause of an earlier storm. This investigation converts local timestamps to UTC and marks what each source knew at the time.",
  sections: [
    {
      id: "event-snapshot",
      title: "Put forecasts and observations on separate rows",
      paragraphs: [
        "On May 9 at 20:38 UTC, NOAA's Space Weather Prediction Center issued its first G4 geomagnetic storm watch since 2005 for May 10 through May 12. The watch followed at least five Earth-directed coronal mass ejections. A watch states expected conditions. It is not an observation that G4 conditions already exist.",
        "NOAA reported observed G5 conditions at 6:54 p.m. EDT on May 10, which is 22:54 UTC. NOAA published that update at 23:58 UTC. NASA's later review says at least seven coronal mass ejections erupted from May 7 through May 11 and that waves reached Earth on May 10. The storm reached G5, the highest level on NOAA's geomagnetic storm scale.",
      ],
      table: {
        caption: "Selected May 2024 source timeline, normalized to UTC where a clock time is available",
        headings: ["Date and time", "Source statement", "Evidence type"],
        rows: [
          ["May 9, 20:38 UTC", "G4 watch for May 10 to May 12", "Forecast"],
          ["May 10, 22:54 UTC", "G5 conditions observed", "Geomagnetic observation"],
          ["May 11, 01:23 UTC", "X5.8 flare, converted from May 10 at 9:23 p.m. EDT", "Later solar observation"],
          ["May 14", "X8.7 flare", "Later solar observation"],
        ],
      },
      sources: [
        {
          label: "NOAA SWPC: G4 watch issued May 9, 2024",
          href: "https://www.spaceweather.gov/news/swpc-issues-its-first-g4-watch-2005",
        },
        {
          label: "NOAA SWPC: G5 conditions observed May 10, 2024",
          href: "https://www.spaceweather.gov/news/g5-conditions-observed",
        },
      ],
    },
    {
      id: "normalize-the-clock",
      title: "Convert the clock before ordering the events",
      paragraphs: [
        "Eastern Daylight Time was UTC−4 in May 2024. Add four hours to NOAA's 6:54 p.m. observation: 18:54 + 04:00 = 22:54 UTC on May 10. Add four hours to NASA's May 10 flare time of 9:23 p.m.: 21:23 + 04:00 = 01:23 UTC on May 11. Crossing midnight changes the UTC date.",
        "The X5.8 flare at 01:23 UTC occurred 2 hours 29 minutes after NOAA's G5 observation at 22:54 UTC. It therefore cannot explain the earlier observation. NASA also recorded an X8.7 flare on May 14, four calendar days after May 10. That later flare belongs to the same active period, not to the cause of a storm already under way.",
        "The timeline uses horizontal spacing to clarify order. It does not use a continuous time scale between May 11 and May 14, and it does not show CME travel distance or speed.",
      ],
      sources: [
        {
          label: "NASA: how the May 2024 solar storm was tracked",
          href: "https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/",
        },
      ],
    },
    {
      id: "limits-of-the-timeline",
      title: "A timeline alone cannot assign one CME to one effect",
      paragraphs: [
        "Several coronal mass ejections were involved, and NASA describes them as moving at different speeds and catching up with one another. Subtracting the date of a solar eruption from the date of a geomagnetic observation does not isolate one CME's transit time. That calculation needs a matched eruption, arrival signature, and measurement basis.",
        "G4 and G5 are levels on NOAA's geomagnetic storm scale. The May 9 watch and the May 10 observation answer different questions, so the rise from G4 to G5 is not a forecast error calculation by itself. To evaluate a forecast, retain its issue time, valid period, predicted range, and the observation series used for verification.",
        "The supported conclusion is chronological. NOAA issued a G4 watch before observing G5 conditions. Solar activity continued afterward. The common UTC timeline rules out later flares as causes of the earlier G5 observation but does not identify the contribution of each earlier CME.",
      ],
      sources: [
        {
          label: "NASA: interacting eruptions during the May 2024 storm",
          href: "https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/",
        },
      ],
    },
  ],
  takeaway:
    "Open the space-weather event archive and choose one event. Copy its source timestamp and time standard before comparing it with a forecast or solar observation. If the two records cannot be matched, report only their order and timing.",
};
