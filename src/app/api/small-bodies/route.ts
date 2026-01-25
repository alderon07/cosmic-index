import { NextRequest, NextResponse } from "next/server";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import { SmallBodyQuerySchema } from "@/lib/types";
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
    const parseResult = SmallBodyQuerySchema.safeParse(searchParams);

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

    // Fetch small bodies
    const result = await fetchSmallBodies(params);

    // Return response with cache headers
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.SMALL_BODIES_BROWSE),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("Error fetching small bodies:", error);
    return NextResponse.json(
      { error: "Failed to fetch small bodies. Please try again later." },
      { status: 500 }
    );
  }
}
