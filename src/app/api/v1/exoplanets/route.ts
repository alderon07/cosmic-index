import { NextRequest } from "next/server";
import { searchExoplanets } from "@/lib/exoplanet-index";
import { ExoplanetQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams, validateNoPaginationConflict } from "@/lib/api-middleware";
import { apiPaginated, apiError, handleRouteError } from "@/lib/api-response";
import { CursorValidationError } from "@/lib/cursor";
import { ErrorCode, ERROR_STATUS } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, ExoplanetQuerySchema, requestId);
  if (params instanceof Response) return params;

  // Strict: cursor + page can't coexist
  const conflict = validateNoPaginationConflict(params.data, requestId);
  if (conflict) return conflict;

  try {
    const result = await searchExoplanets(params.data);

    if (result.usedCursor) {
      return apiPaginated(result.objects, {
        mode: "cursor",
        limit: result.limit,
        hasMore: result.hasMore,
        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
      }, requestId, {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.EXOPLANETS_BROWSE),
        ...rateLimit.headers,
      });
    }

    return apiPaginated(result.objects, {
      mode: "offset",
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.EXOPLANETS_BROWSE),
      ...rateLimit.headers,
    });
  } catch (error) {
    if (error instanceof CursorValidationError) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        "Invalid cursor for this request.",
        ERROR_STATUS[ErrorCode.VALIDATION_ERROR],
        requestId,
        { reason: error.reason },
        rateLimit.headers,
      );
    }
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
