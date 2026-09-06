import Link from "next/link";
import { GUIDES } from "@/content/guide-index";

export function HomeFieldGuides() {
  return (
    <section
      className="border-b border-border bg-card/40"
      aria-labelledby="field-guides"
    >
      <div className="shell-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Read the evidence
            </p>
            <h2
              id="field-guides"
              className="mt-3 font-display text-2xl leading-relaxed sm:text-3xl"
            >
              The numbers are a starting point.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                Two planets can have the same radius and very different
                interiors. A busy solar-event feed does not establish a storm at
                Earth. An asteroid&apos;s monitoring label does not predict an
                impact. Understanding the measurement matters as much as finding
                it.
              </p>
              <p>
                Start with a question, use the catalog to compare the relevant
                records, and follow the source when uncertainty matters. Our
                field guides walk through that process with calculations you can
                reproduce and examples that separate observations from
                interpretations.
              </p>
              <p>
                The scientific archives supply the observations. Cosmic Index
                brings records together, connects planets with their host stars,
                and explains how to read the results. Missing measurements stay
                unknown, and worked examples are labelled so they cannot be
                mistaken for live data.
              </p>
            </div>
            <Link
              href="/learn"
              className="mt-5 inline-block text-sm text-primary underline underline-offset-4"
            >
              Explore all field guides
            </Link>
          </div>
          <ol className="divide-y divide-border border-y border-border">
            {GUIDES.map((guide, index) => (
              <li
                key={guide.slug}
                className="grid grid-cols-[2rem_1fr] gap-3 py-6"
              >
                <span
                  aria-hidden="true"
                  className="pt-1 font-mono text-sm text-primary/70"
                >
                  0{index + 1}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {guide.topic}
                  </p>
                  <h3 className="mt-2 text-lg font-medium leading-7">
                    <Link
                      href={`/learn/${guide.slug}`}
                      className="rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                    >
                      {guide.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {guide.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
