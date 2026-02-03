import { NextRequest, NextResponse } from "next/server";
import { searchExoplanets, ExoplanetIndexUnavailableError } from "@/lib/exoplanet-index";
import { ExoplanetQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientId, "BROWSE");

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = ExoplanetQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const params = parseResult.data;

    // Fetch exoplanets from Turso index (no TAP fallback for browse)
    const result = await searchExoplanets(params);

    // Return response with cache headers
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.EXOPLANETS_BROWSE),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    // Handle index unavailable separately - return 503
    if (error instanceof ExoplanetIndexUnavailableError) {
      return NextResponse.json(
        { error: "Exoplanet index is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    console.error("Error fetching exoplanets:", error);
    return NextResponse.json(
      { error: "Failed to fetch exoplanets. Please try again later." },
      { status: 500 }
    );
  }
}
