import { NextRequest } from "next/server";
import { getStarBySlug } from "@/lib/star-index";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
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
    const star = await getStarBySlug(id);

    if (!star) {
      return apiError(
        ErrorCode.NOT_FOUND,
        "Star not found.",
        ERROR_STATUS[ErrorCode.NOT_FOUND],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }

    return apiSuccess(star, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.STARS_DETAIL),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
