import { TRAPPIST_PLANETS } from "@/content/trappist-comparison";

export function PlanetSizeComparison() {
  const worlds = [{ name: "Earth", radiusEarth: 1 }, ...TRAPPIST_PLANETS];
  return (
    <figure className="my-8 rounded-lg border border-border p-4 sm:p-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        {worlds.map((world) => (
          <div key={world.name} className="min-w-0 text-center">
            <svg viewBox="0 0 130 140" role="img" aria-label={`${world.name}: radius ${world.radiusEarth} times Earth's`} className="mx-auto w-full max-w-40">
              <circle cx="65" cy="70" r={48 * world.radiusEarth} className={world.name === "Earth" ? "fill-secondary/15 stroke-secondary" : "fill-primary/15 stroke-primary"} strokeWidth="2" />
              <line x1="65" y1="70" x2={65 + 48 * world.radiusEarth} y2="70" stroke="currentColor" strokeWidth="1" />
              <circle cx="65" cy="70" r="2" fill="currentColor" />
            </svg>
            <p className="text-sm font-medium">{world.name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{world.radiusEarth} R⊕</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-5 text-sm leading-7 text-muted-foreground">Radii share one scale. Colors distinguish the reference Earth from the exoplanets and do not depict their appearance. R⊕ means Earth radii. Source values are in the table above.</figcaption>
    </figure>
  );
}
