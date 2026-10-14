import snapshot from "../../../public/research/exoplanet-completeness-2026-10-14.json";

export function ExoplanetCompleteness() {
  return (
    <figure className="my-8 space-y-6 rounded-lg border border-border p-4 sm:p-6" aria-labelledby="completeness-caption">
      <figcaption id="completeness-caption" className="text-sm leading-7">
        Share of default records with both reported mass and radius, excluding limits.
        Each bar runs from 0 to 100%. Groups with at least 50 planets are shown;
        the table below includes every method. Snapshot: October 14, 2026.
      </figcaption>
      {snapshot.groups.filter((group) => group.total >= 50).map((group) => {
        const percent = 100 * group.both / group.total;
        return (
          <div key={group.method}>
            <p className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
              <span>{group.method}</span>
              <span className="font-mono">{group.both.toLocaleString("en-US")} / {group.total.toLocaleString("en-US")} · {percent.toFixed(1)}%</span>
            </p>
            <div aria-hidden="true" className="h-3 overflow-hidden rounded bg-muted">
              <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
      <details className="border-t border-border pt-4 text-sm">
        <summary className="cursor-pointer rounded text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">Query and downloadable summary</summary>
        <p className="mt-4 leading-7 text-muted-foreground">
          Retrieved {snapshot.retrievedAt}. The download retains aggregate counts, the query,
          and a SHA-256 fingerprint of the source response, not individual planet rows.
          Rerunning the query returns the current archive, which can differ from this snapshot.
        </p>
        <pre tabIndex={0} aria-label="NASA TAP query" className="my-4 overflow-x-auto rounded bg-muted p-4 focus-visible:outline-2 focus-visible:outline-primary"><code>{snapshot.query}</code></pre>
        <p className="flex flex-wrap gap-4">
          <a className="text-primary underline underline-offset-4" href="/research/exoplanet-completeness-2026-10-14.json" download>Download dated summary JSON</a>
          <a className="text-primary underline underline-offset-4" href={snapshot.sourceUrl}>Run query against NASA</a>
        </p>
      </details>
    </figure>
  );
}
