import { NextRequest } from "next/server";
import { fetchSmallBodyBySlug } from "@/lib/jpl-sbdb";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { SmallBodyDataSchema } from "@/lib/types";
import { initRequest, withRateLimit } from "@/lib/api-middleware";
import { apiSuccess, apiError, handleRouteError } from "@/lib/api-response";
import { ErrorCode, ERROR_STATUS } from "@/lib/api-errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "DETAIL", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const { id } = await params;

  try {
    const smallBody = await fetchSmallBodyBySlug(id);

    if (!smallBody) {
      return apiError(
        ErrorCode.NOT_FOUND,
        "Small body not found.",
        ERROR_STATUS[ErrorCode.NOT_FOUND],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }

    const validated = SmallBodyDataSchema.parse(smallBody);

    return apiSuccess(validated, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SMALL_BODIES_DETAIL),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
