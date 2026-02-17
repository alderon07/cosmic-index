import { NextRequest } from "next/server";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiPaginated, handleRouteError } from "@/lib/api-response";
import { fetchSpaceWeatherNotifications } from "@/lib/nasa-donki";
import { SpaceWeatherNotificationsQuerySchema } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const pageParamPresent = request.nextUrl.searchParams.has("page");
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, SpaceWeatherNotificationsQuerySchema, requestId);
  if (params instanceof Response) return params;

  try {
    const result = await fetchSpaceWeatherNotifications({
      startDate: params.data.startDate,
      endDate: params.data.endDate,
      type: params.data.type,
      page: params.data.page,
      limit: params.data.limit,
    });

    const extraMeta = {
      count: result.notifications.length,
      limitApplied: result.limitApplied,
      totalAvailable: result.totalAvailable,
      totalCapApplied: result.meta.totalCapApplied,
      totalCap: result.meta.totalCap,
      dateRange: result.meta.dateRange,
      typeIncluded: result.meta.typeIncluded,
      ...(result.meta.warnings ? { warnings: result.meta.warnings } : {}),
    };

    if (pageParamPresent) {
      const page = result.page ?? params.data.page ?? 1;
      const total = result.totalAvailable;
      const hasMore = page * result.limitApplied < total;

      return apiPaginated(
        result.notifications,
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
      result.notifications,
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
