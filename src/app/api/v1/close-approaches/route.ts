import { NextRequest } from "next/server";
import { fetchCloseApproaches } from "@/lib/cneos-close-approach";
import { CloseApproachQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiPaginated, handleRouteError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, CloseApproachQuerySchema, requestId);
  if (params instanceof Response) return params;

  try {
    const result = await fetchCloseApproaches(params.data);

    // Extract limit from params (CloseApproachQuerySchema has optional limit)
    const limitApplied = params.data.limit ?? 100;

    return apiPaginated(result.events, {
      mode: "none",
      hasMore: false as const,
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.CLOSE_APPROACH_LIST),
      ...rateLimit.headers,
    }, {
      count: result.events.length,
      limitApplied,
      ...(params.data.limit !== undefined ? { limitRequested: params.data.limit } : {}),
      phaFilterApplied: result.meta.phaFilterApplied,
      queryApplied: result.meta.queryApplied,
      ...(result.highlights ? { highlights: result.highlights } : {}),
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
