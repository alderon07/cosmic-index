import { NextRequest, NextResponse } from "next/server";
import { fetchSpaceWeather } from "@/lib/nasa-donki";
import { SpaceWeatherQuerySchema, SpaceWeatherEventType } from "@/lib/types";
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
    const parseResult = SpaceWeatherQuerySchema.safeParse(searchParams);

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

    // Parse eventTypes from comma-separated string to array
    let eventTypes: SpaceWeatherEventType[] | undefined;
    if (params.eventTypes) {
      const types = params.eventTypes.split(",").map((t) => t.trim().toUpperCase());
      const validTypes = types.filter(
        (t): t is SpaceWeatherEventType => ["FLR", "CME", "GST"].includes(t)
      );
      if (validTypes.length > 0) {
        eventTypes = validTypes;
      }
    }

    // Fetch space weather events
    const result = await fetchSpaceWeather({
      startDate: params.startDate,
      endDate: params.endDate,
      eventTypes,
      limit: params.limit,
    });

    // Return response with cache headers
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER),
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error(`[${requestId}] Error fetching space weather:`, {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle timeout errors
    if (errorMessage.includes("timed out")) {
      return NextResponse.json(
        {
          error: "DONKI API temporarily unavailable. Please try again.",
          requestId,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch space weather data. Please try again later.",
        requestId,
      },
      { status: 500 }
    );
  }
}
