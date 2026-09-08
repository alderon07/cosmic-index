import type { GuideSlug } from "@/content/guide-index";

interface InvestigationDiagramProps {
  guide: GuideSlug;
  section: string;
}

function AsteroidDistanceDiagram() {
  return (
    <figure className="my-8 rounded-lg border border-border p-4 sm:p-6">
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Scrollable distance diagram"
      >
        <svg
          viewBox="0 0 540 300"
          role="img"
          aria-label="Diagram of the reported 2023 BU flyby distance"
          className="w-full min-w-[30rem]"
        >
        <desc>
          A cross-section of Earth shows 6,371 kilometers from the center to the
          surface, then 3,600 kilometers from the surface to the asteroid. The
          combined geocentric distance is 9,971 kilometers.
        </desc>
        <circle cx="160" cy="155" r="125" className="fill-secondary/15 stroke-secondary" strokeWidth="3" />
        <circle cx="160" cy="155" r="4" className="fill-foreground" />
        <text x="160" y="294" textAnchor="middle" className="fill-foreground text-[18px] font-medium">Earth</text>
        <line x1="160" y1="155" x2="285" y2="155" className="stroke-secondary" strokeWidth="3" />
        <line x1="285" y1="155" x2="356" y2="155" className="stroke-primary" strokeWidth="3" strokeDasharray="8 6" />
        <circle cx="356" cy="155" r="10" className="fill-primary" />
        <text x="356" y="130" textAnchor="middle" className="fill-foreground text-[17px] font-medium">2023 BU</text>
        <text x="223" y="184" textAnchor="middle" className="fill-muted-foreground text-[15px]">6,371 km</text>
        <text x="321" y="205" textAnchor="middle" className="fill-muted-foreground text-[15px]">about 3,600 km</text>
        <line x1="160" y1="28" x2="356" y2="28" className="stroke-foreground" strokeWidth="1.5" />
        <line x1="160" y1="20" x2="160" y2="36" className="stroke-foreground" strokeWidth="1.5" />
        <line x1="356" y1="20" x2="356" y2="36" className="stroke-foreground" strokeWidth="1.5" />
        <text x="258" y="16" textAnchor="middle" className="fill-foreground text-[15px]">about 10,000 km</text>
        </svg>
      </div>
      <figcaption className="mt-4 text-sm leading-7 text-muted-foreground">
        The two line segments use one linear scale. The asteroid is enlarged and
        the encounter orientation is invented for readability. The diagram does
        not show the trajectory.
      </figcaption>
    </figure>
  );
}

function StormTimelineDiagram() {
  const events = [
    { x: 80, date: "May 9", label: "G4 watch" },
    { x: 285, date: "May 10, 22:54 UTC", label: "G5 observed" },
    { x: 480, date: "May 11, 01:23 UTC", label: "Later X5.8 flare" },
    { x: 650, date: "May 14", label: "Later X8.7 flare" },
  ];

  return (
    <figure className="my-8 rounded-lg border border-border p-4 sm:p-6">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable event timeline">
        <svg
          viewBox="0 0 730 260"
          role="img"
          aria-label="Timeline of the May 2024 space-weather investigation"
          className="min-w-[44rem]"
        >
          <desc>
            NOAA issued a G4 watch on May 9. G5 conditions were observed on May
            10 at 22:54 UTC. A later X5.8 flare occurred on May 11 at 01:23 UTC,
            two hours and twenty-nine minutes after the G5 observation. An X8.7
            flare occurred on May 14.
          </desc>
          <line x1="80" y1="118" x2="650" y2="118" className="stroke-border" strokeWidth="3" />
          {events.map((event, index) => (
            <g key={`${event.date}-${event.label}`}>
              {index === 0 ? (
                <polygon points={`${event.x},107 ${event.x + 11},118 ${event.x},129 ${event.x - 11},118`} className="fill-secondary" />
              ) : index === 1 ? (
                <circle cx={event.x} cy="118" r="9" className="fill-primary" />
              ) : (
                <rect x={event.x - 8} y="110" width="16" height="16" className="fill-secondary" />
              )}
              <text x={event.x} y={index % 2 === 0 ? 82 : 157} textAnchor="middle" className="fill-foreground text-[15px] font-medium">{event.label}</text>
              <text x={event.x} y={index % 2 === 0 ? 62 : 179} textAnchor="middle" className="fill-muted-foreground text-[13px]">{event.date}</text>
            </g>
          ))}
          <line x1="285" y1="218" x2="480" y2="218" className="stroke-primary" strokeWidth="1.5" />
          <line x1="285" y1="210" x2="285" y2="226" className="stroke-primary" strokeWidth="1.5" />
          <line x1="480" y1="210" x2="480" y2="226" className="stroke-primary" strokeWidth="1.5" />
          <text x="382" y="246" textAnchor="middle" className="fill-primary text-[14px]">2 h 29 min later</text>
        </svg>
      </div>
      <figcaption className="mt-4 text-sm leading-7 text-muted-foreground">
        Events are ordered left to right. The gap to May 14 is compressed, so
        horizontal length is not a continuous time scale. Forecasts and
        observations use different markers: a diamond for the watch, a circle
        for the geomagnetic observation, and squares for the solar flares.
      </figcaption>
    </figure>
  );
}

export function InvestigationDiagram({ guide, section }: InvestigationDiagramProps) {
  if (guide === "2023-bu-close-approach" && section === "change-the-origin") {
    return <AsteroidDistanceDiagram />;
  }
  if (guide === "may-2024-geomagnetic-storm" && section === "normalize-the-clock") {
    return <StormTimelineDiagram />;
  }
  return null;
}
