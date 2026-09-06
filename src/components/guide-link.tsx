import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getGuide, type GuideSlug } from "@/content/guide-index";

export function GuideLink({ slug }: { slug: GuideSlug }) {
  const guide = getGuide(slug);
  if (!guide) return null;
  return (
    <Link
      href={`/learn/${guide.slug}`}
      className="mt-3 inline-flex items-start gap-2 text-sm leading-6 text-primary underline underline-offset-4"
    >
      <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
      <span>Field guide: {guide.title}</span>
    </Link>
  );
}
