import { z } from "zod";
import { CACHE_TTL, CACHE_KEYS, hashParams, getCached, setCached } from "./cache";
import type { ObjectType, SmallBodyKind } from "./types";

// ── Types ──────────────────────────────────────────────────────────────────

export interface NasaImage {
  nasaId: string;
  title: string;
  description?: string;
  center?: string;
  dateCreated?: string;
  keywords?: string[];
  credit?: string;
  thumbnailUrl: string;
  imageUrl: string;
}

export interface NasaImagesResult {
  images: NasaImage[];
  totalHits: number;
  usedQuery: string;
}

// ── Zod Schemas ────────────────────────────────────────────────────────────

const NasaImageDataSchema = z.object({
  nasa_id: z.string(),
  title: z.string().optional().default(""),
  description: z.string().optional(),
  center: z.string().optional(),
  date_created: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  secondary_creator: z.string().optional(),
  photographer: z.string().optional(),
});

const NasaImageLinkSchema = z.object({
  href: z.string(),
  rel: z.string().optional(),
  render: z.string().optional(),
});

const NasaImageItemSchema = z.object({
  data: z.array(NasaImageDataSchema).min(1),
  links: z.array(NasaImageLinkSchema).optional(),
});

const NasaImagesResponseSchema = z.object({
  collection: z.object({
    items: z.array(NasaImageItemSchema).default([]),
    metadata: z.object({
      total_hits: z.number().optional(),
    }).optional(),
  }),
});

const NasaAssetManifestSchema = z.object({
  collection: z.object({
    items: z.array(z.object({
      href: z.string(),
    })),
  }),
});

// ── Constants ──────────────────────────────────────────────────────────────

const SEARCH_BASE_URL = "https://images-api.nasa.gov/search";
const ASSET_BASE_URL = "https://images-api.nasa.gov/asset";
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const BASE_DELAY_MS = 500;
const MAX_IMAGES = 12;

// ── Search parameters for object queries ───────────────────────────────────

export interface ImageSearchParams {
  type: ObjectType;
  name: string;
  hostStar?: string;
  bodyKind?: SmallBodyKind;
}

// ── Relevance Scoring ──────────────────────────────────────────────────────

// Mission/instrument/hardware terms that indicate the image is NOT about a body
const NEGATIVE_TERMS = /\b(spacecraft|satellite|probe|telescope|observatory|rover|launch|liftoff|technicians?|payload|fairing|booster|countdown|solar panel|solar array|antenna|clean ?room|processing facility|shipping container|vault|figurine|lego|aboard|ISS|Hubble|JWST|James Webb|Spitzer|Chandra|JunoCam|instrument|mission control)\b/i;

// Positive terms per object type that indicate actual body imagery
const POSITIVE_TERMS: Record<ObjectType, RegExp> = {
  SMALL_BODY: /\b(asteroid|comet|surface|crater|regolith|near-earth|meteorite|nucleus|tail|coma|icy|rocky|boulder|dust|impact|rotation|shape model|topograph|close-up|flyby|mosaic|terrain|landslide|dwarf planet|approach|color view|survey|ice|infrared|spectrum|orbit class)\b/i,
  EXOPLANET: /\b(exoplanet|planet|habitable|transit|radial velocity|light curve|star system|planetary system|artist.?s?.?concept|illustration|comparison|lineup|orbit|zone|spectrum|atmosphere)\b/i,
};

const RELEVANCE_THRESHOLD = 0;

/**
 * Score a search result for relevance to the cosmic object.
 *
 * Positive signals: body-type terms, object name / host star in title.
 * Negative signals: mission/hardware/instrument terms.
 *
 * Items below RELEVANCE_THRESHOLD are filtered out.
 */
function scoreItem(
  item: z.infer<typeof NasaImageItemSchema>,
  params: ImageSearchParams
): number {
  const data = item.data[0];
  if (!data) return -Infinity;

  const title = data.title ?? "";
  const desc = data.description ?? "";
  const text = `${title} ${desc}`;
  const kw = (data.keywords ?? []).join(" ");
  const all = `${text} ${kw}`;

  let score = 0;

  // Positive: body-type context terms
  const positivePattern = POSITIVE_TERMS[params.type];
  const positiveMatches = all.match(new RegExp(positivePattern.source, "gi"));
  if (positiveMatches) {
    score += positiveMatches.length * 3;
  }

  // Positive: object name or host star in title
  if (params.hostStar && params.hostStar !== "Unknown") {
    if (title.toLowerCase().includes(params.hostStar.toLowerCase())) score += 2;
  }
  if (title.toLowerCase().includes(params.name.toLowerCase())) score += 2;

  // Negative: mission/hardware/instrument noise
  const negativeMatches = all.match(new RegExp(NEGATIVE_TERMS.source, "gi"));
  if (negativeMatches) {
    score -= negativeMatches.length * 3;
  }

  return score;
}

/**
 * Filter and rank search result items by relevance score.
 * Only items above RELEVANCE_THRESHOLD are kept, sorted best-first.
 */
function filterRelevantItems(
  items: z.infer<typeof NasaImageItemSchema>[],
  params: ImageSearchParams
): z.infer<typeof NasaImageItemSchema>[] {
  return items
    .map((item) => ({ item, score: scoreItem(item, params) }))
    .filter(({ score }) => score > RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// ── Core Functions ─────────────────────────────────────────────────────────

/** Search the NASA Image and Video Library with retry and timeout. */
async function fetchNasaImageSearch(
  query: string,
  pageSize: number = MAX_IMAGES
): Promise<z.infer<typeof NasaImagesResponseSchema> | null> {
  const url = new URL(SEARCH_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("media_type", "image");
  url.searchParams.set("page_size", String(pageSize));

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "cosmic-index/1.0",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const err = new Error(
          `NASA Images API error: ${response.status} ${response.statusText}\nQuery: ${query}\nBody: ${text.slice(0, 500)}`
        );
        if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
          lastErr = err;
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }

      const json = await response.json();
      const parsed = NasaImagesResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.warn("[NASA Images] Failed to parse search response:", parsed.error.message);
        return null;
      }

      return parsed.data;
    } catch (err: unknown) {
      lastErr = err;
      const errObj = err as { name?: string; message?: string };
      const isAbort = errObj?.name === "AbortError";

      if (attempt < MAX_ATTEMPTS && (isAbort || /fetch failed/i.test(errObj?.message ?? ""))) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error("[NASA Images] Search failed:", errObj?.message ?? String(err));
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error("[NASA Images] Search failed after retries:", String(lastErr));
  return null;
}

/**
 * Fetch the asset manifest for a NASA image and pick the best full-res URL.
 * Preference: ~orig.jpg > ~large.jpg > ~medium.jpg
 * Results are individually cached for 24h.
 */
async function fetchAssetManifest(nasaId: string): Promise<string | null> {
  const cacheKey = `${CACHE_KEYS.NASA_IMAGES}:asset:${nasaId}`;
  const cached = await getCached<string>(cacheKey);
  if (cached !== null) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ASSET_BASE_URL}/${encodeURIComponent(nasaId)}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "cosmic-index/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const parsed = NasaAssetManifestSchema.safeParse(json);
    if (!parsed.success) {
      return null;
    }

    const urls = parsed.data.collection.items.map((item) => item.href);

    // Pick the best available image by suffix preference
    const jpgUrls = urls.filter((u) => /\.jpe?g$/i.test(u));
    const pick =
      jpgUrls.find((u) => /~orig\.jpe?g$/i.test(u)) ??
      jpgUrls.find((u) => /~large\.jpe?g$/i.test(u)) ??
      jpgUrls.find((u) => /~medium\.jpe?g$/i.test(u)) ??
      jpgUrls[0] ??
      null;

    if (pick) {
      await setCached(pick, pick, CACHE_TTL.NASA_IMAGES);
    }

    return pick;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Resolve full-res image URLs for a batch of search results in parallel. */
async function resolveFullImageUrls(
  items: z.infer<typeof NasaImageItemSchema>[]
): Promise<NasaImage[]> {
  const results = await Promise.allSettled(
    items.map(async (item): Promise<NasaImage | null> => {
      const data = item.data[0];
      if (!data) return null;

      // Thumbnail from search result links
      const thumbnailUrl =
        item.links?.find((l) => l.rel === "preview")?.href ??
        item.links?.[0]?.href ??
        "";

      if (!thumbnailUrl) return null;

      // Full-res from asset endpoint
      const imageUrl = await fetchAssetManifest(data.nasa_id);

      // Credit from secondary_creator or photographer
      const credit = data.secondary_creator || data.photographer;

      return {
        nasaId: data.nasa_id,
        title: data.title || "Untitled",
        description: data.description,
        center: data.center,
        dateCreated: data.date_created,
        keywords: data.keywords,
        credit,
        thumbnailUrl,
        imageUrl: imageUrl ?? thumbnailUrl, // Fall back to thumbnail if asset fails
      };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<NasaImage> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

/**
 * Build an ordered list of search queries for a cosmic object.
 * Uses contextual terms (exoplanet, asteroid, comet) for disambiguation.
 * Stops at the first query that returns relevant results.
 */
function buildImageSearchQueries(params: ImageSearchParams): string[] {
  const queries: string[] = [];
  const add = (q: string) => {
    if (q && !queries.includes(q)) queries.push(q);
  };

  if (params.type === "EXOPLANET") {
    // Most specific first: host star + "exoplanet"
    if (params.hostStar && params.hostStar !== "Unknown") {
      add(`${params.hostStar} exoplanet`);
      add(`${params.hostStar} planetary system`);
      add(params.hostStar);
    }
    // Display name with trailing planet letter stripped
    const stripped = params.name.replace(/\s+[a-z]$/i, "").trim();
    add(`${stripped} exoplanet`);
    add(stripped);
  } else {
    // Small bodies: name + body kind for disambiguation
    const kind = params.bodyKind ?? "asteroid";
    add(`${params.name} ${kind}`);
    add(params.name);
  }

  return queries;
}

/**
 * Search for NASA images relevant to a cosmic object.
 * Runs a query chain, stops at first query with relevant scored results,
 * resolves full-res URLs. Caches with differentiated TTLs (24h results, 2h empty).
 */
export async function searchImagesForObjectWithTtl(
  params: ImageSearchParams
): Promise<NasaImagesResult> {
  const cacheKey = `${CACHE_KEYS.NASA_IMAGES}:obj:${hashParams({
    name: params.name,
    type: params.type,
  })}`;

  // Check cache manually to handle different TTLs
  const cached = await getCached<NasaImagesResult>(cacheKey);
  if (cached !== null) return cached;

  const queries = buildImageSearchQueries(params);

  for (const query of queries) {
    const response = await fetchNasaImageSearch(query, MAX_IMAGES);
    if (!response) continue;

    const relevant = filterRelevantItems(response.collection.items, params);
    const totalHits = response.collection.metadata?.total_hits ?? relevant.length;

    if (relevant.length === 0) continue;

    const images = await resolveFullImageUrls(relevant);

    if (images.length > 0) {
      const result: NasaImagesResult = { images, totalHits, usedQuery: query };
      await setCached(cacheKey, result, CACHE_TTL.NASA_IMAGES);
      return result;
    }
  }

  // Empty result — shorter TTL
  const emptyResult: NasaImagesResult = {
    images: [],
    totalHits: 0,
    usedQuery: queries[0] ?? params.name,
  };
  await setCached(cacheKey, emptyResult, CACHE_TTL.NASA_IMAGES_EMPTY);
  return emptyResult;
}
