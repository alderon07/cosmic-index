import { NextRequest } from "next/server";
import { fetchSpaceWeather } from "@/lib/nasa-donki";
import { SpaceWeatherQuerySchema, SpaceWeatherEventType } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiPaginated, handleRouteError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, SpaceWeatherQuerySchema, requestId);
  if (params instanceof Response) return params;

  try {
    // Parse eventTypes from comma-separated string to array
    let eventTypes: SpaceWeatherEventType[] | undefined;
    if (params.data.eventTypes) {
      const types = params.data.eventTypes.split(",").map((t) => t.trim().toUpperCase());
      const validTypes = types.filter(
        (t): t is SpaceWeatherEventType => ["FLR", "CME", "GST"].includes(t),
      );
      if (validTypes.length > 0) {
        eventTypes = validTypes;
      }
    }

    const result = await fetchSpaceWeather({
      startDate: params.data.startDate,
      endDate: params.data.endDate,
      eventTypes,
      limit: params.data.limit,
    });

    return apiPaginated(result.events, {
      mode: "none",
      hasMore: false as const,
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER),
      ...rateLimit.headers,
    }, {
      count: result.events.length,
      limitApplied: params.data.limit,
      dateRange: result.meta.dateRange,
      typesIncluded: result.meta.typesIncluded,
      ...(result.meta.warnings ? { warnings: result.meta.warnings } : {}),
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
