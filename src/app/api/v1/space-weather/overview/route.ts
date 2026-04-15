import type { NextRequest } from "next/server";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit } from "@/lib/api-middleware";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { buildSpaceWeatherOverviewSnapshot } from "@/lib/space-weather/overview";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  try {
    const result = await buildSpaceWeatherOverviewSnapshot();

    return apiSuccess(result, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_OVERVIEW),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
