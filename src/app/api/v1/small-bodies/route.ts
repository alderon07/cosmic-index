import { NextRequest, NextResponse } from "next/server";
import {
  fetchSmallBodies,
  isContractMismatch,
  isUpstreamFailure,
} from "@/lib/jpl-sbdb";
import { SmallBodyQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  // Generate request ID for debugging
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
    // Log error with request ID for debugging (server-side only)
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorType =
      error instanceof Error ? error.constructor.name : "Unknown";

    console.error(`[${requestId}] Error fetching small bodies:`, {
      type: errorType,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Honest error classification
    // 1. Upstream failure (5xx/timeout) -> 503 "temporarily unavailable"
    // 2. Contract mismatch (400/422/parse errors) -> return empty results, not an error
    // 3. Request cancelled -> don't surface as error
    // 4. Other errors -> 500

    if (error instanceof Error && error.message.includes("cancelled")) {
      // User cancelled the request - not an error
      return NextResponse.json(
        { objects: [], total: 0, page: 1, limit: 20, hasMore: false },
        { status: 200 }
      );
    }

    if (isUpstreamFailure(error)) {
      return NextResponse.json(
        {
          error: "Search temporarily unavailable. Please try again.",
          requestId,
        },
        { status: 503 }
      );
    }

    if (isContractMismatch(error)) {
      // Contract mismatch - return empty results rather than failing
      // This prevents user-facing errors on API contract changes
      console.warn(
        `[${requestId}] Contract mismatch, returning empty results:`,
        errorMessage
      );
      return NextResponse.json(
        { objects: [], total: 0, page: 1, limit: 20, hasMore: false },
        {
          status: 200,
          headers: {
            "Cache-Control": getCacheControlHeader(
              CACHE_TTL.SMALL_BODIES_BROWSE
            ),
          },
        }
      );
    }

    // Unknown error
    return NextResponse.json(
      {
        error: "Failed to fetch small bodies. Please try again later.",
        requestId,
      },
      { status: 500 }
    );
  }
}
