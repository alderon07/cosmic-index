import { NextRequest, NextResponse } from "next/server";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import { SmallBodyQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "@/lib/rate-limit";

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorType = error instanceof Error ? error.constructor.name : "Unknown";
    
    console.error(`[${requestId}] Error fetching small bodies:`, {
      type: errorType,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Determine appropriate error message and status based on error type
    let status = 500;
    let userMessage = "Failed to fetch small bodies. Please try again later.";

    if (error instanceof Error) {
      if (error.message.includes("timed out")) {
        status = 504;
        userMessage = "Request to external service timed out. Please try again.";
      } else if (error.message.includes("JPL API error")) {
        status = 502;
        userMessage = "External service error. Please try again later.";
      } else if (error.message.includes("parse") || error.message.includes("Invalid")) {
        status = 502;
        userMessage = "Invalid response from external service. Please try again later.";
      }
    }

    return NextResponse.json(
      { 
        error: userMessage,
        requestId, // Include request ID for support/debugging
      },
      { status }
    );
  }
}
