import { NextRequest } from "next/server";
import { ApodFeedError, fetchAPOD, getTodayDateString } from "@/lib/nasa-apod";
import { APODQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiSuccess, apiError, handleRouteError } from "@/lib/api-response";
import { ErrorCode, ERROR_STATUS } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, APODQuerySchema, requestId);
  if (params instanceof Response) return params;

  const { date } = params.data;

  // Validate date is not in the future
  if (date) {
    if (date > getTodayDateString()) {
      return apiError(
        ErrorCode.INVALID_DATE_RANGE,
        "Cannot request APOD for a future date.",
        ERROR_STATUS[ErrorCode.INVALID_DATE_RANGE],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }

    if (date < "1995-06-16") {
      return apiError(
        ErrorCode.INVALID_DATE_RANGE,
        "APOD archive starts from 1995-06-16.",
        ERROR_STATUS[ErrorCode.INVALID_DATE_RANGE],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }
  }

  try {
    const result = await fetchAPOD(date);

    return apiSuccess(result, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.APOD),
      ...rateLimit.headers,
    });
  } catch (error) {
    if (error instanceof ApodFeedError) {
      const code = error.kind === "not-found" ? ErrorCode.NOT_FOUND
        : error.kind === "contract" ? ErrorCode.CONTRACT_MISMATCH : ErrorCode.UPSTREAM_UNAVAILABLE;
      return apiError(code, error.kind === "not-found" ? error.message
        : "NASA APOD is temporarily unavailable. Please try again later.",
        ERROR_STATUS[code], requestId, undefined,
        { ...rateLimit.headers, ...(error.kind === "unavailable" ? { "Retry-After": "60" } : {}) });
    }
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
