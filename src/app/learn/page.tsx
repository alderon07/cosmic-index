import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GUIDES } from "@/content/guide-index";
import { BASE_URL } from "@/lib/config";
import { Breadcrumbs } from "@/components/breadcrumbs";

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
