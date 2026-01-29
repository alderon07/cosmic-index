import { NextRequest, NextResponse } from "next/server";
import { getStarBySlug } from "@/lib/star-index";
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

    // Fetch star by slug
    const star = await getStarBySlug(id);

    if (!star) {
      return NextResponse.json(
        { error: "Star not found" },
        { status: 404 }
      );
    }

    // Return response with cache headers
    return NextResponse.json(star, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.STARS_DETAIL),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("Error fetching star:", error);
    return NextResponse.json(
      { error: "Failed to fetch star. Please try again later." },
      { status: 500 }
    );
  }
}
