import { NextRequest } from "next/server";
import { getExoplanetBySlug } from "@/lib/exoplanet-index";
import { fetchExoplanetBySlug } from "@/lib/nasa-exoplanet";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { ExoplanetDataSchema } from "@/lib/types";
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
    // Try Turso index first (fast, no external API call)
    let exoplanet = await getExoplanetBySlug(id);

    // Fallback to TAP API if not in index (or index unavailable)
    if (!exoplanet) {
      exoplanet = await fetchExoplanetBySlug(id);
    }

    if (!exoplanet) {
      return apiError(
        ErrorCode.NOT_FOUND,
        "Exoplanet not found.",
        ERROR_STATUS[ErrorCode.NOT_FOUND],
        requestId,
        undefined,
        rateLimit.headers,
      );
    }

    const validated = ExoplanetDataSchema.parse(exoplanet);

    return apiSuccess(validated, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.EXOPLANETS_DETAIL),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
