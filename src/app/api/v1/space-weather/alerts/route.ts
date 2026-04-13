import { NextRequest } from "next/server";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiPaginated, handleRouteError } from "@/lib/api-response";
import { SpaceWeatherAlertsQuerySchema } from "@/lib/types";
import { fetchUnifiedSpaceWeatherAlerts } from "@/lib/space-weather/alerts";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const pageParamPresent = request.nextUrl.searchParams.has("page");
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, SpaceWeatherAlertsQuerySchema, requestId);
  if (params instanceof Response) return params;

  try {
    const result = await fetchUnifiedSpaceWeatherAlerts({
      startDate: params.data.startDate,
      endDate: params.data.endDate,
      type: params.data.type,
      page: params.data.page,
      limit: params.data.limit,
    });

    const extraMeta = {
      count: result.alerts.length,
      limitApplied: result.limitApplied,
      totalAvailable: result.totalAvailable,
      totalCapApplied: result.meta.totalCapApplied,
      totalCap: result.meta.totalCap,
      dateRange: result.meta.dateRange,
      typeIncluded: result.meta.typeIncluded,
      sourcesIncluded: result.meta.sourcesIncluded,
      relatedEventsResolved: result.meta.relatedEventsResolved,
      ...(result.meta.warnings ? { warnings: result.meta.warnings } : {}),
    };

    if (pageParamPresent) {
      const page = result.page ?? params.data.page ?? 1;
      const total = result.totalAvailable;
      const hasMore = page * result.limitApplied < total;

      return apiPaginated(
        result.alerts,
        {
          mode: "offset",
          page,
          limit: result.limitApplied,
          total,
          hasMore,
        },
        requestId,
        {
          "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_NOTIFICATIONS),
          ...rateLimit.headers,
        },
        extraMeta,
      );
    }

    return apiPaginated(
      result.alerts,
      {
        mode: "none",
        hasMore: false as const,
      },
      requestId,
      {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_NOTIFICATIONS),
        ...rateLimit.headers,
      },
      extraMeta,
    );
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
