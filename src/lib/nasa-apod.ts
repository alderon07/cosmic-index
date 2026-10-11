import { z } from "zod";
import type { APODData } from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS } from "./cache";
import { deriveApodVideoThumbnail, getApodVideoSource } from "./apod-media";

// NASA moved APOD to the public NASA Science feed in September 2026.
const APOD_API_URL = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";
const API_TIMEOUT_MS = 15_000;

export class ApodFeedError extends Error {
  constructor(public readonly kind: "unavailable" | "contract" | "not-found", message: string) {
    super(message);
    this.name = "ApodFeedError";
  }
}

function isNasaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (url.hostname === "nasa.gov" || url.hostname.endsWith(".nasa.gov"));
  } catch { return false; }
}

const EntrySchema = z.object({
  date: z.iso.date(),
  title: z.string().min(1).max(1000),
  explanation: z.string().max(100_000),
  permalink: z.string().refine(isNasaUrl),
  media_type: z.enum(["image", "video"]),
  hdurl: z.string().nullish(),
  credit: z.string().max(10_000).nullish(),
  copyright: z.string().max(10_000).nullish(),
  basic_html: z.string().max(300_000).optional(),
});

function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
    rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—",
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match: string, entity: string) => {
    if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
    const code = entity.toLowerCase().startsWith("#x")
      ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code) : match;
  });
}

function plainText(html: string): string {
  return decodeEntities(html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}

function transformEntry(raw: z.infer<typeof EntrySchema>): APODData {
  const image = raw.hdurl && isNasaUrl(raw.hdurl) ? raw.hdurl : undefined;
  let videoUrl: string | undefined;
  if (raw.media_type === "video") {
    // The feed's url is an article. Extract approved media without rendering its HTML.
    for (const match of (raw.basic_html ?? "").matchAll(/<(?:iframe|video|source)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
      const source = getApodVideoSource(decodeEntities(match[1]));
      if (source) { videoUrl = source.src; break; }
    }
  } else if (!image) {
    throw new ApodFeedError("contract", "NASA APOD feed returned an invalid image URL");
  }

  return {
    date: raw.date,
    title: plainText(raw.title),
    explanation: plainText(raw.explanation).replace(/^Explanation:\s*/i, "")
      .replace(/\s*Tomorrow['’]s picture:.*$/i, "").trim(),
    imageUrl: videoUrl ?? image ?? raw.permalink,
    imageUrlHd: image,
    mediaType: raw.media_type,
    copyright: plainText(raw.credit || raw.copyright || "") || undefined,
    thumbnailUrl: raw.media_type === "video"
      ? image ?? (videoUrl ? deriveApodVideoThumbnail(videoUrl) : undefined) : undefined,
    sourceUrl: raw.permalink,
  };
}

export async function fetchAPOD(date?: string): Promise<APODData> {
  if (date && !z.iso.date().safeParse(date).success) throw new Error("Invalid APOD date");
  // Discard legacy cached responses and roll the latest key over in NASA's time zone.
  const cacheKey = `${CACHE_KEYS.APOD}:v2:${date ?? `latest:${getTodayDateString()}`}`;
  return withCache(cacheKey, CACHE_TTL.APOD, async () => {
    const url = date ? `${APOD_API_URL}/${date.replace(/-/g, "").slice(2)}`
      : `${APOD_API_URL}/?per_page=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "cosmic-index/1.0 (https://cosmicindex.dev)" },
        signal: controller.signal, cache: "no-store",
      });
      if (response.status === 404) throw new ApodFeedError("not-found", "NASA has no APOD for this date");
      if (!response.ok) throw new ApodFeedError("unavailable", `NASA APOD feed error: ${response.status}`);
      const payload: unknown = await response.json();
      const raw: unknown = Array.isArray(payload) ? payload[0] : payload;
      if (!raw) throw new ApodFeedError("not-found", "NASA has no APOD for this date");
      const parsed = EntrySchema.safeParse(raw);
      if (!parsed.success) throw new ApodFeedError("contract", "NASA APOD feed returned an invalid response");
      if (date && parsed.data.date !== date) throw new ApodFeedError("contract", "NASA APOD feed returned the wrong date");
      return transformEntry(parsed.data);
    } catch (error) {
      if (error instanceof ApodFeedError) throw error;
      throw new ApodFeedError(error instanceof SyntaxError ? "contract" : "unavailable",
        controller.signal.aborted ? "NASA APOD feed timed out" : "NASA APOD feed could not be read");
    } finally { clearTimeout(timeout); }
  });
}

export function getTodayDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((value) => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
