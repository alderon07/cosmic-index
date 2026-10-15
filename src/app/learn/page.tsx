import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GUIDES } from "@/content/guide-index";
import { BASE_URL } from "@/lib/config";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadingList } from "@/components/learn/reading-list";

export const metadata: Metadata = {
  title: "Field guides to the cosmos",
  description:
    "Original Cosmic Index guides to comparing exoplanets, following space weather, and interpreting asteroid flybys, with worked examples and primary sources.",
  alternates: { canonical: `${BASE_URL}/learn` },
  openGraph: {
    title: "Field guides to the cosmos",
    description:
      "Understand the measurements behind the catalog with worked examples and primary sources.",
    url: `${BASE_URL}/learn`,
    type: "website",
  },
};

export default function LearnPage() {
  return (
    <div className="shell-container py-8 sm:py-12">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Field guides" }]}
      />
      <header className="my-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Cosmic Index / Field notes
        </p>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-5xl">
          Make sense of the measurements.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          A number becomes useful when you know what it measures and what it
          leaves out. These guides pair the catalog tools with worked examples
          so you can reach a conclusion the data actually supports.
        </p>
      </header>
      <ReadingList />
      <section
        id="latest-investigations"
        aria-labelledby="latest-investigations-title"
        className="mb-10 rounded-lg border border-primary/30 bg-primary/5 p-5 sm:p-7"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          Latest investigations
        </p>
        <h2
          id="latest-investigations-title"
          className="mt-3 font-display text-xl sm:text-2xl"
        >
          Investigate the selection and timing behind the numbers
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <article>
            <h3 className="font-medium"><Link href="/learn/fireball-selection" className="text-primary underline underline-offset-4">Which fireballs survive a velocity requirement?</Link></h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">Recount a retained 2025 sample and inspect the 11 records without complete velocity components. Download every input row.</p>
          </article>
          <article>
            <h3 className="font-medium"><Link href="/learn/comparing-exoplanets" className="text-primary underline underline-offset-4">Which planets have both mass and radius?</Link></h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">A dated analysis of 6,445 NASA records shows how requiring both fields changes the discovery-method mix. Inspect the counts and reproduce the query.</p>
          </article>
          <article>
            <h3 className="font-medium">
              <Link
                href="/learn/2023-bu-close-approach"
                className="text-primary underline underline-offset-4"
              >
                2023 BU close-approach forecast
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Convert a surface clearance to a geocentric distance without
              hiding the forecast date or rounded inputs.
            </p>
          </article>
          <article>
            <h3 className="font-medium">
              <Link
                href="/learn/may-2024-geomagnetic-storm"
                className="text-primary underline underline-offset-4"
              >
                May 2024 geomagnetic storm
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Connect an upstream shock record with NOAA&apos;s arrival and
              escalation reports, and test which causal claims the timing supports.
            </p>
          </article>
        </div>
      </section>
      <div className="divide-y divide-border border-y border-border">
        {GUIDES.map((guide, index) => (
          <article
            key={guide.slug}
            className="grid gap-4 py-8 sm:grid-cols-[5rem_1fr] sm:gap-8"
          >
            <span
              aria-hidden="true"
              className="font-mono text-3xl text-primary/70"
            >
              0{index + 1}
            </span>
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {guide.topic}
              </p>
              <h2 className="mt-2 font-display text-xl leading-relaxed sm:text-2xl">
                <Link
                  href={`/learn/${guide.slug}`}
                  className="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                {guide.description}
              </p>
              <Link
                href={`/learn/${guide.slug}`}
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                aria-label={`Read guide: ${guide.title}`}
              >
                Read guide <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <section
        id="site-updates"
        aria-labelledby="site-updates-title"
        className="mt-10 max-w-3xl border-l-2 border-primary/40 pl-5"
      >
        <h2 id="site-updates-title" className="font-display text-lg">
          What changed
        </h2>
        <article className="mt-4 text-sm leading-7 text-muted-foreground">
          <time dateTime="2026-10-14" className="font-mono text-xs uppercase tracking-widest text-primary">October 14, 2026</time>
          <p className="mt-2">The exoplanet comparison now includes a dated completeness analysis, a chart, and a downloadable summary. The May 2024 reconstruction adds arrival evidence and source revisions. TRAPPIST-1 b and e have sourced research notes on their detail pages.</p>
        </article>
        <article className="mt-4 text-sm leading-7 text-muted-foreground">
          <time dateTime="2026-09-07" className="font-mono text-xs uppercase tracking-widest text-primary">
            September 7, 2026
          </time>
          <p className="mt-2">
            New investigations explain{" "}
            <Link href="/learn/2023-bu-close-approach" className="text-primary underline underline-offset-4">
              2023 BU&apos;s flyby distance
            </Link>{" "}
            and{" "}
            <Link href="/learn/may-2024-geomagnetic-storm" className="text-primary underline underline-offset-4">
              the order of events during the May 2024 storm
            </Link>
            . Follow the calculations, inspect the diagrams, and check the
            original sources.
          </p>
        </article>
      </section>
      <section
        className="mt-10 max-w-3xl space-y-3 text-sm leading-7 text-muted-foreground"
        aria-labelledby="editorial-notes"
      >
        <h2
          id="editorial-notes"
          className="font-display text-lg text-foreground"
        >
          About these guides
        </h2>
        <p>
          Cosmic Index publishes these explanations alongside data from public
          scientific archives. Source links support the scientific definitions.
          Worked examples and instructions show how to use the tools; invented
          values are labelled and are never presented as current observations.
        </p>
        <p>
          Catalog summaries are generated from published fields. A calculated
          comparison is not a new observation, and absent data remains unknown.
          For research, follow the source record and its uncertainties. For
          operational forecasts or impact assessments, use the responsible
          agency.
        </p>
        <p><Link href="/about" className="text-primary underline underline-offset-4">About Cosmic Index, data methods, and corrections</Link></p>
        <p>
          Found an error? Use Report a bug in the footer and include the guide
          title and the passage that needs correction. The{" "}
          <Link
            href="/faq"
            className="text-primary underline underline-offset-4"
          >
            FAQ
          </Link>{" "}
          explains the site&apos;s data sources and update behavior.
        </p>
      </section>
    </div>
  );
}
