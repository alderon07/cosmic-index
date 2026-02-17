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

  const pageParamPresent = request.nextUrl.searchParams.has("page");
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
      page: params.data.page,
      limit: params.data.limit,
    });

    const extraMeta = {
      count: result.events.length,
      limitApplied: result.limitApplied,
      totalAvailable: result.totalAvailable,
      totalCapApplied: result.meta.totalCapApplied,
      totalCap: result.meta.totalCap,
      dateRange: result.meta.dateRange,
      typesIncluded: result.meta.typesIncluded,
      ...(result.meta.warnings ? { warnings: result.meta.warnings } : {}),
    };

    if (pageParamPresent) {
      const page = result.page ?? params.data.page ?? 1;
      const total = result.totalAvailable;
      const hasMore = page * result.limitApplied < total;

      return apiPaginated(result.events, {
        mode: "offset",
        page,
        limit: result.limitApplied,
        total,
        hasMore,
      }, requestId, {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER),
        ...rateLimit.headers,
      }, extraMeta);
    }

    return apiPaginated(result.events, {
      mode: "none",
      hasMore: false as const,
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER),
      ...rateLimit.headers,
    }, extraMeta);
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
