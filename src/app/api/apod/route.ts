import { NextRequest, NextResponse } from "next/server";
import { fetchAPOD } from "@/lib/nasa-apod";
import { APODQuerySchema } from "@/lib/types";
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
    const parseResult = APODQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { date } = parseResult.data;

    // Validate date is not in the future
    if (date) {
      const requestedDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (requestedDate > today) {
        return NextResponse.json(
          { error: "Cannot request APOD for a future date" },
          { status: 400 }
        );
      }

      // APOD started on June 16, 1995
      const apodStart = new Date("1995-06-16");
      if (requestedDate < apodStart) {
        return NextResponse.json(
          { error: "APOD archive starts from 1995-06-16" },
          { status: 400 }
        );
      }
    }

    // Fetch APOD
    const result = await fetchAPOD(date);

    // Return response with cache headers
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.APOD),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error(`[${requestId}] Error fetching APOD:`, {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle timeout errors
    if (errorMessage.includes("aborted") || errorMessage.includes("timed out")) {
      return NextResponse.json(
        {
          error: "NASA APOD API temporarily unavailable. Please try again.",
          requestId,
        },
        { status: 503 }
      );
    }

    // Handle rate limit errors from NASA
    if (errorMessage.includes("rate limit")) {
      return NextResponse.json(
        {
          error: "NASA API rate limit exceeded. Please try again later.",
          requestId,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch APOD. Please try again later.",
        requestId,
      },
      { status: 500 }
    );
  }
}
