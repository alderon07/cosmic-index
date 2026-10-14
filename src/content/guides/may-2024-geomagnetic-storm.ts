import type { GuideArticle } from "./types";

export const may2024GeomagneticStorm: GuideArticle = {
  publishedAt: "2026-09-08",
  updatedAt: "2026-10-14",
  introduction:
    "On May 10, 2024, NOAA reported an arriving coronal mass ejection at 16:37 UTC and G5 geomagnetic conditions at 22:54 UTC. The 6 hours 17 minutes between those reports describe the storm's escalation, not the eruption's journey from the Sun. Reconstructing the intervening evidence explains why an arrival alert, a solar flare, and a geomagnetic index cannot substitute for one another.",
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
          ["May 10, 16:37 UTC", "First CME arrival reported by NOAA", "Arrival report, converted from 12:37 p.m. EDT"],
          ["May 10, 17:08 UTC", "G3 conditions reported by NOAA", "Geomagnetic observation"],
          ["May 10, 17:39 UTC", "G4 conditions reported by NOAA", "Geomagnetic observation"],
          ["May 10, 22:54 UTC", "G5 conditions observed", "Geomagnetic observation"],
          ["May 11, 01:23 UTC", "X5.8 flare, converted from May 10 at 9:23 p.m. EDT", "Later solar observation"],
          ["May 14", "X8.7 flare", "Later solar observation"],
        ],
      },
      sources: [
        {
          label: "NOAA: arrival and G3/G4 observations on May 10",
          href: "https://www.noaa.gov/stories/strong-geomagnetic-storm-reaches-earth-continues-through-weekend",
        },
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
      id: "arrival-and-response",
      title: "Separate the arrival from the magnetic response",
      paragraphs: [
        "NOAA's May 10 account reports arrival at 12:37 p.m. EDT, G3 at 1:08 p.m., and G4 at 1:39 p.m. Adding four hours gives 16:37, 17:08, and 17:39 UTC. Relative to the reported arrival, those observations follow by 31 minutes and 62 minutes. The later G5 observation follows by 6 hours 17 minutes. These intervals compare reported milestones. They do not measure a universal response time.",
        "A shock marks an abrupt change in the solar wind. A geomagnetic storm describes Earth's magnetic response to incoming conditions. Fast flow matters, but sustained southward interplanetary magnetic field is especially effective at transferring energy into the magnetosphere. An arrival time alone cannot tell you the duration or orientation of the field that follows.",
        "The G scale describes geomagnetic disturbance using Kp. An X-class flare label describes solar X-ray emission. Comparing their numerical labels would mix different quantities. An X5.8 flare is not a G5.8 storm, and a G5 observation does not identify which flare produced the arriving plasma.",
      ],
      sources: [
        { label: "NOAA: May 10 arrival and storm observations", href: "https://www.noaa.gov/stories/strong-geomagnetic-storm-reaches-earth-continues-through-weekend" },
        { label: "NOAA: solar wind coupling and geomagnetic storms", href: "https://www.spaceweather.gov/phenomena/geomagnetic-storms" },
        { label: "NOAA: definitions of the G, S, and R scales", href: "https://www.swpc.noaa.gov/noaa-scales-explanation" },
      ],
    },
    {
      id: "upstream-record",
      title: "An upstream record adds a location and a revision history",
      paragraphs: [
        "NASA DONKI's version 2 record 2024-05-10T16:36:00-IPS-001 lists a shock at 16:36 UTC, location Earth, with ACE MAG and ACE SWEPAM instruments. Its submission time is May 15 at 00:37 UTC. The event time and submission time are different fields: a later analysis can describe an earlier observation.",
        "The record links five earlier CME identifiers, beginning May 7 at 03:12 and 05:24 UTC and May 8 at 05:36, 12:24, and 19:12 UTC. Those links establish the catalog's associations. They do not apportion the storm's energy among five separate eruptions or provide five independently measured travel times.",
        "DONKI's 16:36 timestamp differs by one minute from NOAA's 16:37 arrival summary. We retain both labels rather than silently choosing one. The difference is small beside the hours of escalation, but source definitions and instrument timing still matter when evaluating a forecast to minute precision.",
        "The same one-day API response also contains a 14:00 UTC shock located at STEREO A. Sorting timestamps without checking location would select it as the earlier Earth arrival. This is a concrete reason to retain observer location before calculating a delay.",
      ],
      sources: [
        { label: "NASA DONKI: version 2 of the May 10 Earth shock record", href: "https://ccmc.gsfc.nasa.gov/DONKI/view/IPS/30688/2" },
        { label: "NASA DONKI: reproduce the one-day shock query", href: "https://ccmc.gsfc.nasa.gov/DONKI-API/get/IPS?startDate=2024-05-10&endDate=2024-05-10" },
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
    {
      id: "test-the-claim",
      title: "What would establish a particular CME's contribution?",
      paragraphs: [
        "Start with the proposed claim: a particular solar eruption drove a particular interval of geomagnetic activity. The solar record must identify an eruption and its direction. An arrival record must identify a disturbance at an observing location. A ground record must show the response. Their order must be physically possible, but order alone cannot establish that they belong to one chain.",
        "Several candidate eruptions make that match harder. A faster CME can catch an earlier one, so the structure near Earth can combine material and magnetic fields from multiple eruptions. Choosing the largest nearby flare because its label is dramatic does not resolve that ambiguity. It discards direction, propagation, and in-situ evidence.",
        "A defensible reconstruction keeps the observer location and time standard beside each timestamp, and retains source revisions. If a source gives an Earth arrival summary while another gives an upstream spacecraft shock time, a difference of minutes need not be an error. Compare definitions before averaging timestamps or calculating travel times.",
        "The watch-to-G5 interval here is 26 hours 16 minutes, from May 9 at 20:38 to May 10 at 22:54 UTC. It is the interval between these two selected reports, not the total warning available to every operator. Earlier advisories, later updates, and the watch's valid window affect any assessment of operational lead time.",
      ],
      table: {
        caption: "Claims tested against the retained evidence",
        headings: ["Claim", "Finding", "Reason"],
        rows: [
          ["The G4 watch preceded observed G5", "Supported", "The selected reports are 26 h 16 min apart"],
          ["The May 11 X5.8 flare caused the first reported G5", "Ruled out by chronology", "It occurred 2 h 29 min afterward"],
          ["The first CME took 6 h 17 min to reach Earth", "Not supported", "That interval starts at reported arrival, not eruption"],
          ["One earlier CME explains the whole storm", "Unresolved here", "Multiple interacting eruptions require matched in-situ evidence"],
        ],
      },
    },
    {
      id: "reconstruction-method",
      title: "Reproduce the intervals and preserve their meaning",
      paragraphs: [
        "This reconstruction uses agency reports checked on October 14, 2026. The table retains their stated event times. It does not substitute page publication times: NOAA's G5 update was published at 23:58 UTC but reported conditions observed at 22:54 UTC. Using publication time would add 64 minutes to the apparent arrival-to-G5 interval.",
        "Convert EDT to UTC by adding four hours, including any date rollover. Express each timestamp as minutes from May 9 at 00:00 UTC before subtraction. The watch is minute 1,238, the next day's reported arrival is minute 2,437, and G5 is minute 2,814. The differences are 1,199 minutes from watch to arrival, 377 from arrival to G5, and 1,576 from watch to G5.",
        "These source reports preserve milestones, not a continuous magnetic-field series or a new forecast evaluation. The site's live event catalog covers a rolling window and cannot replay May 2024. Use the linked historical agency records for this case; use the catalog to apply the same distinctions to recent events.",
      ],
      sources: [{ label: "NOAA: G5 observation time and update publication time", href: "https://www.spaceweather.gov/news/g5-conditions-observed" }],
    },
  ],
  takeaway:
    "Open the space-weather event archive and choose one event. Copy its source timestamp and time standard before comparing it with a forecast or solar observation. If the two records cannot be matched, report only their order and timing.",
};
