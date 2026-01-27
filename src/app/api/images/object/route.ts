import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";
import { searchImagesForObjectWithTtl } from "@/lib/nasa-images";

// Zod schema for query parameters
const ImageQuerySchema = z.object({
  type: z.enum(["EXOPLANET", "SMALL_BODY"]),
  name: z
    .string()
    .transform((s) => s.normalize("NFKC"))
    .pipe(z.string().trim().min(1).max(200)),
  hostStar: z
    .string()
    .transform((s) => s.normalize("NFKC"))
    .pipe(z.string().trim().max(200))
    .optional(),
  bodyKind: z.enum(["asteroid", "comet"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientId, "DETAIL");

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = ImageQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, name, hostStar, bodyKind } = parsed.data;

    // Search for images (handles query chain + asset resolution + caching)
    const result = await searchImagesForObjectWithTtl({
      type,
      name,
      hostStar,
      bodyKind,
    });

    // Use shorter cache header if no images found
    const ttl = result.images.length > 0
      ? CACHE_TTL.NASA_IMAGES
      : CACHE_TTL.NASA_IMAGES_EMPTY;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": getCacheControlHeader(ttl),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("[NASA Images Route] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images. Please try again later." },
      { status: 500 }
    );
  }
}
