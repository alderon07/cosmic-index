import { APODData } from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS } from "./cache";

const APOD_API_URL = "https://api.nasa.gov/planetary/apod";
const API_TIMEOUT_MS = 15000;

// Use NASA_API_KEY if available, otherwise fall back to DEMO_KEY
// Note: DEMO_KEY has rate limits (30 req/hour, 50 req/day)
// For production, get a free key from https://api.nasa.gov/
function getApiKey(): string {
  return process.env.NASA_API_KEY || "DEMO_KEY";
}

// Raw response from NASA APOD API
interface APODRawResponse {
  date: string;
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: "image" | "video";
  copyright?: string;
  thumbnail_url?: string;
}

// Transform raw API response to our internal format
function transformAPODResponse(raw: APODRawResponse): APODData {
  return {
    date: raw.date,
    title: raw.title,
    explanation: raw.explanation,
    imageUrl: raw.url,
    imageUrlHd: raw.hdurl,
    mediaType: raw.media_type,
    copyright: raw.copyright,
    thumbnailUrl: raw.thumbnail_url,
  };
}

// Fetch APOD for a specific date (or today if not specified)
// date format: YYYY-MM-DD
export async function fetchAPOD(date?: string): Promise<APODData> {
  // Build cache key - use date or "today" for current day
  const cacheDate = date || "today";
  const cacheKey = `${CACHE_KEYS.APOD}:${cacheDate}`;

  return withCache(cacheKey, CACHE_TTL.APOD, async () => {
    const params = new URLSearchParams({
      api_key: getApiKey(),
    });

    if (date) {
      params.set("date", date);
    }

    // For videos, request thumbnail
    params.set("thumbs", "true");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(`${APOD_API_URL}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "cosmic-index/1.0",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");

        // Handle specific NASA API errors
        if (response.status === 400) {
          throw new Error(`Invalid date or request: ${text.slice(0, 200)}`);
        }
        if (response.status === 429) {
          throw new Error("NASA API rate limit exceeded. Please try again later.");
        }

        throw new Error(
          `NASA APOD API error: ${response.status} ${response.statusText}`
        );
      }

      const data: APODRawResponse = await response.json();
      return transformAPODResponse(data);
    } finally {
      clearTimeout(timeout);
    }
  });
}

// Get today's date in YYYY-MM-DD format (in NASA's timezone - US Eastern)
export function getTodayDateString(): string {
  // NASA updates APOD around midnight Eastern Time
  // Use UTC-5 as approximation (doesn't account for DST perfectly)
  const now = new Date();
  const easternOffset = -5 * 60; // -5 hours in minutes
  const localOffset = now.getTimezoneOffset();
  const easternTime = new Date(now.getTime() + (localOffset + easternOffset) * 60 * 1000);

  return easternTime.toISOString().split("T")[0];
}
