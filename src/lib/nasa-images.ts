import { z } from "zod";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams, getCached, setCached } from "./cache";
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
 * Stops at the first query that returns results.
 */
function buildImageSearchQueries(params: ImageSearchParams): string[] {
  const queries: string[] = [];

  if (params.type === "EXOPLANET") {
    // Host star first — NASA usually has mission/system imagery, not planet-specific
    if (params.hostStar && params.hostStar !== "Unknown") {
      queries.push(params.hostStar);
    }
    // Display name with trailing planet letter stripped ("TRAPPIST-1 b" → "TRAPPIST-1")
    const stripped = params.name.replace(/\s+[a-z]$/i, "").trim();
    if (stripped && !queries.includes(stripped)) {
      queries.push(stripped);
    }
    // Original display name as fallback if different
    if (!queries.includes(params.name)) {
      queries.push(params.name);
    }
  } else {
    // Small bodies: display name, then display name + body kind
    queries.push(params.name);
    if (params.bodyKind) {
      queries.push(`${params.name} ${params.bodyKind}`);
    }
  }

  return queries;
}

/**
 * Main entrypoint: search for NASA images relevant to a cosmic object.
 * Runs a query chain, stops at the first non-empty result, resolves full-res URLs.
 * Cached by object name + type.
 */
export async function searchImagesForObject(
  params: ImageSearchParams
): Promise<NasaImagesResult> {
  const cacheKey = `${CACHE_KEYS.NASA_IMAGES}:obj:${hashParams({
    name: params.name,
    type: params.type,
  })}`;

  return withCache(cacheKey, CACHE_TTL.NASA_IMAGES, async () => {
    const queries = buildImageSearchQueries(params);

    for (const query of queries) {
      const response = await fetchNasaImageSearch(query, MAX_IMAGES);
      if (!response) continue;

      const items = response.collection.items;
      const totalHits = response.collection.metadata?.total_hits ?? items.length;

      if (items.length === 0) continue;

      const images = await resolveFullImageUrls(items);

      if (images.length > 0) {
        return {
          images,
          totalHits,
          usedQuery: query,
        };
      }
    }

    // No results for any query — cache with shorter TTL
    // We store the empty result here, but withCache uses a single TTL.
    // To handle the shorter TTL for empty results, we need a different approach.
    // Actually, withCache will cache with the TTL we pass. Since we're inside
    // withCache already, the result gets cached at NASA_IMAGES TTL.
    // We'll handle the empty-result TTL in the route layer instead.
    return {
      images: [],
      totalHits: 0,
      usedQuery: queries[0] ?? params.name,
    };
  });
}

/**
 * Variant that caches empty results with a shorter TTL.
 * Call this from the route handler for proper TTL differentiation.
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

    const items = response.collection.items;
    const totalHits = response.collection.metadata?.total_hits ?? items.length;

    if (items.length === 0) continue;

    const images = await resolveFullImageUrls(items);

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
