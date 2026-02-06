import { NextRequest } from "next/server";
import { fetchAPOD } from "@/lib/nasa-apod";
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
    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (requestedDate > today) {
      return apiError(
        ErrorCode.INVALID_DATE_RANGE,
        "Cannot request APOD for a future date.",
        ERROR_STATUS[ErrorCode.INVALID_DATE_RANGE],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }

    const apodStart = new Date("1995-06-16");
    if (requestedDate < apodStart) {
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
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
