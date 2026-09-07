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
              Start with a question.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                How long is a year on another planet? How close is an asteroid
                flyby? What happens between a solar eruption and a geomagnetic
                storm? Choose a guide and work through the evidence.
              </p>
              <p>
                Start with the TRAPPIST-1 comparison for a real example. You can
                change the time interval, compare the planets&apos; sizes, and
                open the source records without creating an account.
              </p>
              <p>
                Save a guide for later to build a reading list in this browser.
                Each guide ends with a question to investigate in the catalog.
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
