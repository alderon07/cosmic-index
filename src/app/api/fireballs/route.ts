import { NextRequest, NextResponse } from "next/server";
import { fetchFireballs } from "@/lib/cneos-fireball";
import { FireballQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

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
    const parseResult = FireballQuerySchema.safeParse(searchParams);

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

    // Fetch fireballs
    const result = await fetchFireballs(params);

    // Return response with cache headers
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.FIREBALL_LIST),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error(`[${requestId}] Error fetching fireballs:`, {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle timeout errors
    if (errorMessage.includes("timed out")) {
      return NextResponse.json(
        {
          error: "CNEOS Fireball API temporarily unavailable. Please try again.",
          requestId,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch fireballs. Please try again later.",
        requestId,
      },
      { status: 500 }
    );
  }
}
