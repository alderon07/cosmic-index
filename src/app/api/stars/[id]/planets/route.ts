import { NextRequest, NextResponse } from "next/server";
import { getStarBySlug } from "@/lib/star-index";
import { fetchExoplanetsForHostStar } from "@/lib/nasa-exoplanet";
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

    // Get star first to verify it exists and get hostname
    const star = await getStarBySlug(id);

    if (!star) {
      return NextResponse.json(
        { error: "Star not found" },
        { status: 404 }
      );
    }

    // Fetch exoplanets for this host star from TAP API (with Redis caching)
    const planets = await fetchExoplanetsForHostStar(star.hostname);

    // Return response with cache headers
    return NextResponse.json(
      { planets },
      {
        headers: {
          "Cache-Control": getCacheControlHeader(CACHE_TTL.STARS_PLANETS),
          ...getRateLimitHeaders(rateLimitResult),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching planets for star:", error);
    return NextResponse.json(
      { error: "Failed to fetch planets. Please try again later." },
      { status: 500 }
    );
  }
}
