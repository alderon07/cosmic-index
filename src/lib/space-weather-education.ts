export interface SpaceWeatherTerm {
  term: string;
  brief: string;
  explanation: string;
  impact: string;
  scale?: Array<{ label: string; description: string }>;
}

export const SPACE_WEATHER_EDUCATION: Record<string, SpaceWeatherTerm> = {
  SPACE_WEATHER: {
    term: "Space Weather",
    brief:
      "Conditions in space driven by the Sun that can affect Earth's technology, satellites, and even power grids.",
    explanation:
      "Space weather refers to the changing conditions in the space environment between the Sun and Earth. The Sun constantly emits a stream of charged particles called the solar wind, and occasionally releases bursts of energy and matter that can interact with Earth's magnetic field and upper atmosphere.",
    impact:
      "Space weather can disrupt GPS signals, degrade high-frequency radio communications, damage satellites, endanger astronauts, and in extreme cases cause widespread power grid failures. It also produces the aurora borealis and australis.",
  },

  SOLAR_FLARE: {
    term: "Solar Flare",
    brief:
      "A sudden flash of increased brightness on the Sun, releasing electromagnetic radiation across the spectrum.",
    explanation:
      "Solar flares are sudden eruptions of electromagnetic radiation from the Sun's surface, typically from magnetically active regions called sunspots. They accelerate to peak brightness within minutes and can last from minutes to hours. The radiation travels at the speed of light, reaching Earth in about 8 minutes.",
    impact:
      "Strong flares can cause radio blackouts on Earth's dayside, degrade GPS accuracy, and pose radiation risks to astronauts and high-altitude aircraft passengers. They often accompany coronal mass ejections.",
    scale: [
      { label: "A/B-class", description: "Background levels — no Earth effects" },
      { label: "C-class", description: "Small — minor effects, mostly at polar regions" },
      { label: "M-class", description: "Moderate — brief radio blackouts at polar regions, minor navigation signal degradation" },
      { label: "X-class", description: "Major — planet-wide radio blackouts, navigation degradation for hours, radiation storms possible" },
    ],
  },

  CME: {
    term: "Coronal Mass Ejection",
    brief:
      "A massive burst of solar wind and magnetic field rising above the solar corona, released into space.",
    explanation:
      "A coronal mass ejection (CME) is a significant release of plasma and magnetic field from the Sun's corona. CMEs can carry billions of tons of material at speeds ranging from 250 to over 3,000 km/s. Unlike flare radiation which arrives in minutes, CMEs typically take 1–3 days to reach Earth.",
    impact:
      "Earth-directed CMEs can trigger geomagnetic storms that affect power grids, spacecraft operations, and satellite communications. They are the primary driver of severe space weather and produce the most dramatic aurora displays.",
  },

  GST: {
    term: "Geomagnetic Storm",
    brief:
      "A temporary disturbance of Earth's magnetosphere caused by a solar wind shock wave or CME impact.",
    explanation:
      "Geomagnetic storms occur when solar wind structures (usually CMEs or high-speed streams) interact with Earth's magnetosphere. The storm compresses the magnetosphere and injects energy into the radiation belts and ring current. Storms are measured by the Kp index on the NOAA G-scale.",
    impact:
      "Storms can induce electric currents in power grids (potentially causing transformer damage), degrade satellite orbits through increased atmospheric drag, disrupt HF radio and GPS, and push the aurora to lower latitudes.",
    scale: [
      { label: "G1 (Minor)", description: "Kp 5 — Weak power grid fluctuations, minor satellite effects, aurora visible at high latitudes" },
      { label: "G2 (Moderate)", description: "Kp 6 — Voltage alarms in power systems, drag effects on LEO satellites, aurora visible at ~55° latitude" },
      { label: "G3 (Strong)", description: "Kp 7 — Voltage corrections needed, satellite surface charging, HF radio intermittent, aurora at ~50° latitude" },
      { label: "G4 (Severe)", description: "Kp 8 — Widespread voltage control problems, spacecraft tracking issues, HF radio blackout, aurora at ~45° latitude" },
      { label: "G5 (Extreme)", description: "Kp 9 — Grid collapse possible, extensive satellite damage, complete HF radio blackout, aurora at ~40° latitude" },
    ],
  },

  IPS: {
    term: "Interplanetary Shock",
    brief:
      "A shock wave propagating through the solar wind, often driven by a fast CME overtaking slower wind ahead of it.",
    explanation:
      "Interplanetary shocks form when fast-moving solar wind (often from a CME) collides with the slower ambient solar wind. The resulting shock wave compresses and heats the surrounding plasma. When the shock arrives at Earth, it causes a sudden impulse in the magnetic field — a signature easily detected by ground magnetometers.",
    impact:
      "Interplanetary shocks are often the first indication that a geomagnetic storm is about to begin. They compress the magnetosphere suddenly, causing a storm sudden commencement (SSC) that can trigger immediate geomagnetic disturbance.",
  },

  HSS: {
    term: "High-Speed Stream",
    brief:
      "A fast-flowing stream of solar wind from a coronal hole that can buffet Earth's magnetosphere for days.",
    explanation:
      "High-speed solar wind streams originate from coronal holes — regions where the Sun's magnetic field opens outward, allowing solar wind to escape at speeds of 600–800+ km/s. These streams are more persistent than CMEs and can recur every ~27 days as the Sun rotates.",
    impact:
      "HSS interactions cause extended periods of minor to moderate geomagnetic activity. While less dramatic than CME-driven storms, their recurring nature means they account for a significant portion of total geomagnetic disturbance, especially during the declining phase of the solar cycle.",
  },

  SEP: {
    term: "Solar Energetic Particles",
    brief:
      "High-energy particles (mostly protons) accelerated by solar flares or CME-driven shock waves.",
    explanation:
      "Solar energetic particle events send high-energy protons and heavier ions streaming through interplanetary space. They can arrive at Earth within minutes to hours of a solar event. SEP events are divided into 'impulsive' (flare-accelerated, brief) and 'gradual' (shock-accelerated, longer-duration).",
    impact:
      "SEPs are the primary radiation concern for astronauts and passengers on polar airline routes. They can damage satellite electronics, degrade solar panels, and cause increased ionization in the polar atmosphere that absorbs HF radio signals (polar cap absorption).",
  },

  KP_INDEX: {
    term: "Kp Index",
    brief:
      "A global measure of geomagnetic disturbance on a 0–9 scale, derived from ground magnetometer networks.",
    explanation:
      "The Kp index is a 3-hour planetary geomagnetic activity index based on the maximum fluctuations of horizontal components observed at sub-auroral magnetometer stations. Values range from 0 (quiet) to 9 (extreme storm). It is the most widely used index for characterizing geomagnetic storms.",
    impact:
      "Kp 5+ is classified as a geomagnetic storm (G1). Higher values indicate stronger storms with broader impacts on technology and more equatorward aurora visibility. The Kp index maps directly to the NOAA G-scale used for storm warnings.",
  },

  SUVI: {
    term: "GOES SUVI",
    brief:
      "The Solar Ultraviolet Imager on NOAA's GOES satellites, capturing real-time images of the Sun's corona.",
    explanation:
      "SUVI (Solar Ultraviolet Imager) is an instrument on NOAA's GOES-16 and GOES-18 satellites that images the Sun in extreme ultraviolet wavelengths. Different wavelength channels highlight different temperatures and structures: 131 Angstroms shows hot flare plasma (~10 million K), while 195 Angstroms shows coronal loops and structures (~1.5 million K).",
    impact:
      "SUVI images are essential for identifying active regions, tracking flare evolution, and detecting eruptions in near-real-time. Forecasters use them to assess solar activity and issue space weather warnings.",
  },

  DRAP: {
    term: "D-RAP",
    brief:
      "D-Region Absorption Prediction — a model showing where high-frequency radio signals are being absorbed in the ionosphere.",
    explanation:
      "D-RAP (D-Region Absorption Prediction) is a NOAA SWPC product that models absorption of high-frequency (HF) radio waves in the ionosphere's D-region. When solar flare X-rays or energetic particles increase ionization in this layer, radio waves passing through it are absorbed rather than reflected, causing communication blackouts.",
    impact:
      "D-RAP is critical for aviation and maritime communications that rely on HF radio. When absorption is elevated, pilots and mariners may need to switch to satellite communications. It also affects amateur radio operators and emergency communications networks.",
  },

  SOLAR_WIND: {
    term: "Solar Wind",
    brief:
      "A continuous stream of charged particles flowing outward from the Sun through interplanetary space.",
    explanation:
      "The solar wind is a plasma of electrons and ions constantly escaping the Sun's outer atmosphere. Typical speeds range from about 300 to 800 km/s, but both the speed and density can change abruptly when high-speed streams or CME-driven structures sweep past Earth.",
    impact:
      "Solar wind sets the background conditions for space weather near Earth. Faster, denser wind can compress the magnetosphere, while changes in the embedded magnetic field determine how efficiently energy can couple into Earth's magnetic environment.",
  },

  IMF_BZ: {
    term: "IMF Bz",
    brief:
      "The north-south component of the interplanetary magnetic field, one of the most important inputs for geomagnetic storm potential.",
    explanation:
      "Bz measures whether the magnetic field carried by the solar wind points northward or southward relative to Earth's field. Southward Bz allows solar-wind magnetic field lines to reconnect more easily with Earth's magnetosphere, opening the door to stronger energy transfer.",
    impact:
      "When Bz turns strongly southward, geomagnetic coupling becomes much more efficient. That can intensify aurora, increase substorm activity, and raise the chance that a solar-wind disturbance will become a meaningful geomagnetic storm.",
  },

  HP30: {
    term: "Hp30 Index",
    brief:
      "A high-resolution geomagnetic index updated every 30 minutes by GFZ Potsdam, replacing the older Kp index for nowcasting.",
    explanation:
      "The Hp30 index is a half-hourly version of the classic planetary geomagnetic activity index, produced by GFZ German Research Centre for Geosciences. While the traditional Kp index is released as a 3-hour average with significant delay, Hp30 provides near-real-time updates every 30 minutes using the same underlying methodology.",
    impact:
      "Hp30 allows space weather forecasters and operators to detect geomagnetic disturbances much faster than waiting for the official Kp. It's especially valuable for power grid operators and satellite controllers who need rapid awareness of changing conditions.",
  },

  AE_INDEX: {
    term: "AE Index",
    brief:
      "The Auroral Electrojet index — a measure of auroral zone geomagnetic activity from magnetometer stations at ~65–70° latitude.",
    explanation:
      "The AE (Auroral Electrojet) index measures the intensity of electrical currents flowing in the ionosphere at auroral latitudes. It is derived from magnetometer data at stations distributed around the northern auroral zone. AE consists of AU (upper envelope, eastward electrojet) and AL (lower envelope, westward electrojet).",
    impact:
      "The AE index is a sensitive indicator of magnetospheric substorm activity. High AE values indicate strong auroral zone currents, which correlate with visible aurora, ionospheric heating, and increased satellite drag. It's a finer-grained measure of geomagnetic activity than Kp for high-latitude effects.",
  },

  DONKI: {
    term: "DONKI",
    brief:
      "NASA's Database Of Notifications, Knowledge, Information — the definitive catalog of space weather events.",
    explanation:
      "DONKI (Database Of Notifications, Knowledge, Information) is maintained by NASA's Community Coordinated Modeling Center (CCMC). It catalogs solar flares, CMEs, geomagnetic storms, interplanetary shocks, high-speed streams, and solar energetic particle events, along with their relationships and linked activity chains.",
    impact:
      "DONKI is the primary data source for research-grade space weather event records. It provides structured event data with causality links (e.g., which flare triggered which CME, which CME caused which storm), making it invaluable for understanding space weather chains.",
  },

  SWPC: {
    term: "SWPC",
    brief:
      "NOAA's Space Weather Prediction Center — the U.S. government's official source for space weather forecasts, watches, warnings, and alerts.",
    explanation:
      "The Space Weather Prediction Center (SWPC) is a laboratory and service center of the National Weather Service, part of NOAA. Located in Boulder, Colorado, it provides real-time monitoring, forecasting, and alerts for space weather events that affect Earth.",
    impact:
      "SWPC issues the official U.S. space weather watches, warnings, and alerts that power grid operators, satellite controllers, airlines, and emergency managers rely on for protective action decisions.",
  },

  POLAR_CAP_ABSORPTION: {
    term: "Polar Cap Absorption",
    brief:
      "Absorption of HF radio signals over the polar regions caused by energetic protons from solar events ionizing the D-layer.",
    explanation:
      "Polar Cap Absorption (PCA) events occur when solar energetic protons penetrate deep into the polar atmosphere, increasing ionization in the D-region of the ionosphere. Because Earth's magnetic field funnels these particles toward the poles, absorption is concentrated over polar and high-latitude regions.",
    impact:
      "PCA events can completely black out HF radio communications on polar routes — a critical concern for transpolar aviation. Events can last for days, forcing airlines to reroute flights to lower latitudes, increasing fuel costs and flight times.",
  },
} as const;

export type SpaceWeatherTermKey = keyof typeof SPACE_WEATHER_EDUCATION;
