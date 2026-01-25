import { NextRequest, NextResponse } from "next/server";
import { fetchExoplanetBySlug } from "@/lib/nasa-exoplanet";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Fetch exoplanet by slug
    const exoplanet = await fetchExoplanetBySlug(id);

    if (!exoplanet) {
      return NextResponse.json(
        { error: "Exoplanet not found" },
        { status: 404 }
      );
    }

    // Return response with cache headers
    return NextResponse.json(exoplanet, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.EXOPLANETS_DETAIL),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("Error fetching exoplanet:", error);
    return NextResponse.json(
      { error: "Failed to fetch exoplanet. Please try again later." },
      { status: 500 }
    );
  }
}
