import { NextRequest } from "next/server";
import { z } from "zod";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { searchImagesForObjectWithTtl } from "@/lib/nasa-images";
import { initRequest, withRateLimit, validateParams } from "@/lib/api-middleware";
import { apiSuccess, handleRouteError } from "@/lib/api-response";

const ImageQuerySchema = z.object({
  type: z.enum(["EXOPLANET", "SMALL_BODY", "STAR"]),
  name: z
    .string()
    .transform((s) => s.normalize("NFKC"))
    .pipe(z.string().trim().min(1).max(200)),
  hostStar: z
    .string()
    .transform((s) => s.normalize("NFKC"))
    .pipe(z.string().trim().max(200))
    .optional(),
  bodyKind: z.enum(["asteroid", "comet"]).optional(),
});

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "DETAIL", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, ImageQuerySchema, requestId);
  if (params instanceof Response) return params;

  try {
    const { type, name, hostStar, bodyKind } = params.data;

    const result = await searchImagesForObjectWithTtl({
      type,
      name,
      hostStar,
      bodyKind,
    });

    const ttl = result.images.length > 0
      ? CACHE_TTL.NASA_IMAGES
      : CACHE_TTL.NASA_IMAGES_EMPTY;

    return apiSuccess(result, requestId, {
      "Cache-Control": getCacheControlHeader(ttl),
      ...rateLimit.headers,
    });
  } catch (error) {
    return handleRouteError(error, requestId, rateLimit.headers);
  }
}
