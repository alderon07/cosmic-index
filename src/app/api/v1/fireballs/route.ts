import { NextRequest } from "next/server";
import { fetchFireballs } from "@/lib/cneos-fireball";
import { FireballQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiPaginated, handleRouteError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, FireballQuerySchema, requestId);
  if (params instanceof Response) return params;

  try {
    const result = await fetchFireballs(params.data);

    return apiPaginated(result.events, {
      mode: "none",
      hasMore: false as const,
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.FIREBALL_LIST),
      ...rateLimit.headers,
    }, {
      count: result.events.length,
      limitApplied: params.data.limit,
      filtersApplied: result.meta.filtersApplied,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
