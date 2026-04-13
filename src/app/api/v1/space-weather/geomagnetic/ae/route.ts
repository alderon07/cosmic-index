import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit } from "@/lib/api-middleware";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { fetchGeomagneticAeSnapshot } from "@/lib/space-weather/geomagnetic";

export async function GET(request: Request) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  try {
    const result = await fetchGeomagneticAeSnapshot();
    return apiSuccess(result, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SPACE_WEATHER_GEOMAGNETIC_AE),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
