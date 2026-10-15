import snapshot from "../../../public/research/fireballs-2025-retrieved-2026-10-14.json";
import { FIREBALL_RESEARCH_URL, FIREBALL_SNAPSHOT_PATH, summarizeFireballs } from "@/lib/editorial/fireball-completeness";

const counts = summarizeFireballs(snapshot);
const groups = [
  { label: "Location", count: counts.location },
  { label: "Altitude", count: counts.altitude },
  { label: "Entry velocity components", count: counts.velocity },
];

export function FireballCompleteness() {
  return (
    <figure className="my-8 border border-primary/30 bg-primary/5 p-5 sm:p-7" aria-labelledby="fireball-completeness-caption">
      <figcaption id="fireball-completeness-caption" className="font-display text-lg">
        Reported fields in the retained 2025 sample
      </figcaption>
      <ul className="mt-6 space-y-5">
        {groups.map(({ label, count }) => (
          <li key={label}>
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
              <span>{label}</span>
              <span className="font-mono">{count} of {counts.total} · {(100 * count / counts.total).toFixed(1)}%</span>
            </div>
            <div aria-hidden="true" className="h-3 bg-muted">
              <div className="h-full bg-primary" style={{ width: `${100 * count / counts.total}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm leading-7 text-muted-foreground">Each bar uses all {counts.total} records as its denominator. Requirements are independent, not successive steps. Retrieved October 14, 2026.</p>
      <a href={FIREBALL_SNAPSHOT_PATH} download className="mt-4 inline-block text-sm text-primary underline underline-offset-4">Download all retained input rows as JSON</a>
      <details className="mt-5 text-sm">
        <summary className="cursor-pointer text-primary">Reproduce the counts</summary>
        <p className="mt-3 leading-7 text-muted-foreground">Count non-null location fields, altitude, and complete vx, vy, vz groups in the download. Zero values count as reported. The repository script runs offline against this file.</p>
        <code className="mt-3 block break-all">bun scripts/analyze-fireball-completeness.ts</code>
        <a href={FIREBALL_RESEARCH_URL} className="mt-3 inline-block text-primary underline underline-offset-4">Run the original JPL query, which may now return revised data</a>
      </details>
    </figure>
  );
}
