import { z } from "zod";
import { getGuide, type GuideSlug } from "@/content/guide-index";

export const READING_LIST_KEY = "cosmic-index:reading-list:v1";
const storedListSchema = z.array(z.string()).max(100);

export function parseReadingList(raw: string | null): GuideSlug[] {
  if (!raw || raw.length > 4096) return [];
  try {
    const result = storedListSchema.safeParse(JSON.parse(raw));
    if (!result.success) return [];
    return [...new Set(result.data.flatMap((slug) => {
      const guide = getGuide(slug);
      return guide ? [guide.slug] : [];
    }))];
  } catch {
    return [];
  }
}

export function toggleReadingList(saved: GuideSlug[], slug: GuideSlug): GuideSlug[] {
  return saved.includes(slug) ? saved.filter((entry) => entry !== slug) : [...saved, slug];
}
