import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GUIDES, getGuide } from "@/content/guide-index";
import { GUIDE_ARTICLES } from "@/content/guides/articles";
import { BASE_URL } from "@/lib/config";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd } from "@/lib/seo";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const url = `${BASE_URL}/learn/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const article = GUIDE_ARTICLES[guide.slug];
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Field guides", href: "/learn" },
    { label: guide.topic },
  ];
  const relatedGuides = GUIDES.filter((entry) => entry.slug !== guide.slug);

  return (
    <div className="shell-container py-8 sm:py-12">
      <JsonLd data={buildBreadcrumbJsonLd(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} />
      <header className="mb-10 mt-8 max-w-4xl border-b border-primary/30 pb-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Field guide / {guide.topic}
        </p>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl lg:text-5xl">
          {guide.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          {article.introduction}
        </p>
        <p className="mt-5 text-sm text-muted-foreground">
          By Cosmic Index · Worked examples with primary sources
        </p>
      </header>
      <div className="grid items-start gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
        <nav
          aria-label="In this guide"
          className="border-l-2 border-primary/40 pl-5 lg:sticky lg:top-24"
        >
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-primary">
            In this guide
          </p>
          <ol className="space-y-3">
            {article.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block text-sm leading-6 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <span className="mr-2 font-mono text-primary">
                    {index + 1}.
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="min-w-0 max-w-3xl">
          <div className="space-y-12">
            {article.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
                aria-labelledby={`${section.id}-heading`}
              >
                <h2
                  id={`${section.id}-heading`}
                  className="mb-5 font-display text-xl leading-relaxed sm:text-2xl"
                >
                  {section.title}
                </h2>
                <div className="space-y-4 text-base leading-8 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.table ? (
                  <div
                    className="mt-6 overflow-x-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-primary"
                    tabIndex={0}
                    role="region"
                    aria-label={section.table.caption}
                  >
                    <table className="w-full min-w-[32rem] text-left text-sm">
                      <caption className="caption-top border-b border-border bg-primary/5 px-4 py-3 text-left font-medium text-foreground">
                        {section.table.caption}
                      </caption>
                      <thead className="bg-muted/40">
                        <tr>
                          {section.table.headings.map((heading) => (
                            <th
                              key={heading}
                              scope="col"
                              className="px-4 py-3 font-medium"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {section.table.rows.map((row) => (
                          <tr key={row[0]}>
                            {row.map((cell, index) =>
                              index === 0 ? (
                                <th
                                  key={index}
                                  scope="row"
                                  className="px-4 py-3 font-medium"
                                >
                                  {cell}
                                </th>
                              ) : (
                                <td
                                  key={index}
                                  className="px-4 py-3 leading-6 text-muted-foreground"
                                >
                                  {cell}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {section.sources ? (
                  <ul
                    aria-label={`Sources for ${section.title}`}
                    className="mt-5 space-y-2 border-l border-border pl-4 text-sm leading-6"
                  >
                    {section.sources.map((source) => (
                      <li key={source.href}>
                        <a
                          href={source.href}
                          className="text-primary underline underline-offset-4"
                        >
                          {source.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
          <section
            className="mt-12 border-y border-primary/30 bg-primary/5 p-6"
            aria-labelledby="try-it"
          >
            <h2 id="try-it" className="font-display text-xl">
              Try it with the catalog
            </h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              {article.takeaway}
            </p>
            <Link
              href={guide.toolHref}
              className="mt-5 inline-flex items-center gap-2 text-primary underline underline-offset-4"
            >
              {guide.toolLabel}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
          <nav aria-label="More field guides" className="mt-10">
            <h2 className="font-display text-lg">Keep exploring</h2>
            <ul className="mt-4 space-y-3">
              {relatedGuides.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/learn/${entry.slug}`}
                    className="text-sm leading-7 text-primary underline underline-offset-4"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/learn#editorial-notes"
              className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4"
            >
              Sources, methods, and corrections
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
