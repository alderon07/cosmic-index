import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit } from "@/lib/api-middleware";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { fetchSolarDrapSnapshot } from "@/lib/space-weather/solar";

export async function GET(request: Request) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  try {
    const result = await fetchSolarDrapSnapshot();

    return apiSuccess(result, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_SOLAR_DRAP),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
