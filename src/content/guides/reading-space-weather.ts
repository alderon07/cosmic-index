import type { GuideArticle } from "./types";

export const readingSpaceWeather: GuideArticle = {
  introduction:
    "A busy solar-event feed does not automatically mean a geomagnetic storm is happening at Earth. Cosmic Index brings several observing systems together, but they look at different parts of the Sun-Earth connection. Read them in sequence to understand what has been observed and what still needs confirmation.",
  sections: [
    {
      id: "start-with-time",
      title: "Start with the event time and the source",
      paragraphs: [
        "Open the Space Weather Observatory and choose an event from the event browser. Write down its type, event time, and source. Then open the alerts view and inspect the issue time and validity information on any related message. A newly retrieved record can describe an older event. A page refresh tells you when the app checked the feed, not when the Sun changed.",
        "NOAA watches describe the potential for future activity. Warnings indicate that a condition is expected soon, while alerts indicate that a threshold has been reached or a condition has been observed. Read the specific message: an event catalog entry and an operational warning serve different purposes.",
      ],
      sources: [
        {
          label: "NOAA: alerts, watches, and warnings",
          href: "https://www.swpc.noaa.gov/products/alerts-watches-and-warnings",
        },
      ],
    },
    {
      id: "follow-the-chain",
      title: "Follow the disturbance through the observatory",
      paragraphs: [
        "Geomagnetic storms involve energy transfer from the solar wind into Earth's magnetosphere. Sustained southward magnetic field and fast solar wind can favor that transfer. A coronal mass ejection can drive a disturbance, but high-speed solar wind streams can also do so. The solar image alone cannot tell you the resulting conditions at Earth.",
        "Use the pages below as separate checks. If a feed is stale or unavailable, leave that part of your interpretation unresolved. Another panel continuing to update does not repair the missing observation.",
      ],
      table: {
        caption: "Questions to ask at each stage",
        headings: [
          "Page",
          "Question it helps answer",
          "What it cannot establish alone",
        ],
        rows: [
          [
            "Solar",
            "What activity is visible at the Sun?",
            "Whether a disturbance will affect Earth",
          ],
          [
            "Solar Wind",
            "What plasma and magnetic field are measured upstream?",
            "The complete response at Earth",
          ],
          [
            "Geomagnetic",
            "How is magnetic activity changing?",
            "Whether aurora is visible at your location",
          ],
          [
            "Alerts",
            "What has the issuing agency reported or forecast?",
            "Conditions outside the message's scope and valid time",
          ],
        ],
      },
      sources: [
        {
          label: "NOAA: geomagnetic storms and solar wind conditions",
          href: "https://www.swpc.noaa.gov/phenomena/geomagnetic-storms",
        },
      ],
    },
    {
      id: "worked-reading",
      title: "Work through an incomplete sequence",
      paragraphs: [
        "Imagine a CME appears in the event browser at 09:00 UTC. Later, the solar-wind plot shows a speed increase and a period of southward Bz. These are illustrative observations, not a live forecast. Your first conclusion can be that upstream conditions changed. You cannot yet say that this CME caused the change merely because both appear on the same day.",
        "Next, check the geomagnetic page and the agency alerts for the same interval. Compare timestamps before matching the records. A coherent sequence gives you a stronger account than any single chart, but a causal link still needs support from the source analysis. If the geomagnetic feed has stopped updating, write that limitation into your conclusion instead of calling conditions quiet.",
        "A useful note would read: a solar event was recorded, upstream measurements later changed, and an agency alert describes the subsequent geomagnetic interval. Keep the source links with that note so a later update can be checked against the original evidence.",
      ],
    },
    {
      id: "keep-scales-separate",
      title: "Keep the different severity scales separate",
      paragraphs: [
        "NOAA uses G for geomagnetic storms, S for solar radiation storms, and R for radio blackouts. These describe different phenomena. R3 is not another way to say G3. A radio-blackout report cannot by itself establish an aurora forecast.",
        "Read the name of each plotted index as carefully as its value. Cosmic Index also presents Hp30 and AE data. Do not relabel either as Kp or convert its number directly into an official NOAA G rating. Use the agency's own message for its stated severity, affected systems, and forecast period.",
      ],
      sources: [
        {
          label: "NOAA: space weather scales",
          href: "https://www.swpc.noaa.gov/noaa-scales-explanation",
        },
      ],
    },
  ],
  takeaway:
    "Keep three timestamps in your notes: the event, the observation, and the issued message. Use Cosmic Index to connect the records, then follow the official source for operational decisions. An unknown or stale reading is a gap in the evidence, not a quiet-space-weather measurement.",
};
