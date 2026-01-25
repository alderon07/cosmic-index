import { NextRequest, NextResponse } from "next/server";
import { fetchSmallBodyBySlug } from "@/lib/jpl-sbdb";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("id", id);

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

    // Fetch small body by slug
    const smallBody = await fetchSmallBodyBySlug(id);

    if (!smallBody) {
      return NextResponse.json(
        { error: "Small body not found" },
        { status: 404 }
      );
    }

    // Return response with cache headers
    return NextResponse.json(smallBody, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.SMALL_BODIES_DETAIL),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("Error fetching small body:", error);
    return NextResponse.json(
      { error: "Failed to fetch small body. Please try again later." },
      { status: 500 }
    );
  }
}
