import Link from "next/link";
import { CATALOG_RESEARCH } from "@/content/catalog-research";

export function CatalogResearch({ name }: { name: string }) {
  const note = CATALOG_RESEARCH.find((entry) => entry.name === name);
  if (!note) return null;
  return (
    <section aria-labelledby="catalog-research-title" className="my-8 max-w-3xl space-y-6 rounded-lg border border-primary/30 bg-primary/5 p-5 sm:p-8">
      <header>
        <h2 id="catalog-research-title" className="font-display text-2xl">Research notes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sources checked <time dateTime={note.checkedAt}>October 14, 2026</time>. These dated interpretations are separate from the live catalog fields.</p>
      </header>
      {note.sections.map((section) => (
        <section key={section.id} aria-labelledby={`research-${section.id}`}>
          <h3 id={`research-${section.id}`} className="mb-4 font-display text-lg">{section.title}</h3>
          <div className="space-y-4 leading-8 text-muted-foreground">
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <ul className="mt-4 space-y-2 text-sm" aria-label={`Sources for ${section.title}`}>
            {section.sources?.map((source) => <li key={source.href}><a href={source.href} className="text-primary underline underline-offset-4">{source.label}</a></li>)}
          </ul>
        </section>
      ))}
      <Link href="/learn/trappist-1-comparison" className="inline-block text-primary underline underline-offset-4">Reproduce the comparison of TRAPPIST-1 b and e</Link>
    </section>
  );
}
