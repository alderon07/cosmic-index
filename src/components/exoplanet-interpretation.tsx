import Link from "next/link";
import type { ExoplanetData } from "@/lib/types";
import { buildExoplanetInterpretation } from "@/lib/exoplanet-interpretation";

export function ExoplanetInterpretation({
  exoplanet,
}: {
  exoplanet: ExoplanetData;
}) {
  const notes = buildExoplanetInterpretation(exoplanet);
  return (
    <section
      className="mt-8 rounded-lg border border-primary/25 bg-primary/5 p-5 sm:p-6"
      aria-labelledby="measurement-context"
    >
      <h2 id="measurement-context" className="font-display text-xl">
        What these measurements mean
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {notes.length > 0
          ? "These comparisons use the reported catalog values. They are interpretations and calculations, not additional observations."
          : "This record does not have enough usable measurements for a size or orbital comparison. Missing values remain unknown; they do not establish that this object is small, cold, or unusual."}
      </p>
      {notes.length > 0 ? (
        <dl className="mt-5 grid gap-6 sm:grid-cols-2">
          {notes.map((note) => (
            <div key={note.id}>
              <dt className="font-medium text-foreground">{note.title}</dt>
              <dd className="mt-2 text-sm leading-7 text-muted-foreground">
                {note.text}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-primary/20 pt-4 text-sm">
        <Link
          href="/learn/comparing-exoplanets"
          className="text-primary underline underline-offset-4"
        >
          Work through an exoplanet comparison
        </Link>
        <a
          href="https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html"
          className="text-primary underline underline-offset-4"
        >
          Archive measurement definitions
        </a>
      </div>
    </section>
  );
}
