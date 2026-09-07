"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { TRAPPIST_PLANETS } from "@/content/trappist-comparison";
import { calculateOrbitCount } from "@/lib/guide-tools";

const format = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function OrbitComparison() {
  const [days, setDays] = useState(30);
  function changeInterval(event: ChangeEvent<HTMLSelectElement>) {
    setDays(Number(event.target.value));
  }
  return (
    <section aria-labelledby="orbit-lab" className="my-8 rounded-lg border border-primary/30 bg-primary/5 p-5 sm:p-7">
      <h2 id="orbit-lab" className="font-display text-xl">How many years fit into a month?</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">A year is one orbit around a star. Choose an interval on Earth to compare how many orbits these two planets complete.</p>
      <label className="mt-5 block text-sm font-medium" htmlFor="earth-interval">Time elapsed on Earth</label>
      <select id="earth-interval" value={days} onChange={changeInterval} data-guide-event="guide_calculator_change" data-guide-slug="trappist-1-comparison" className="mt-2 rounded-md border border-primary/40 bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-primary">
        <option value={7}>7 days</option>
        <option value={30}>30 days</option>
        <option value={365.25}>365.25 days</option>
      </select>
      <div aria-live="polite" aria-atomic="true" className="mt-6 space-y-5">
        {TRAPPIST_PLANETS.map((planet) => {
          const orbits = calculateOrbitCount({ earthDays: days, periodDays: planet.periodDays });
          return (
            <div key={planet.slug}>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span>{planet.name}</span>
                <span className="font-mono">About {orbits === null ? "unknown" : format.format(orbits)} orbits</span>
              </div>
              <div className="mt-2 h-3 rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${1.5 / planet.periodDays * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{days} ÷ {planet.periodDays} Earth days per orbit</p>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">Bar lengths compare orbit counts within the selected interval. They do not show orbital distance or the planets&apos; positions. Results use rounded NASA values checked September 6, 2026.</p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">
        {TRAPPIST_PLANETS.map((planet) => <Link key={planet.slug} href={`/exoplanets/${planet.slug}`} data-guide-event="guide_tool_open" data-guide-slug="trappist-1-comparison" className="text-primary underline underline-offset-4">Explore {planet.name}</Link>)}
      </div>
    </section>
  );
}
