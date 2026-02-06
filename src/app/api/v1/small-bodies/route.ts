import { NextRequest } from "next/server";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import { SmallBodyQuerySchema } from "@/lib/types";
import { getCacheControlHeader, CACHE_TTL } from "@/lib/cache";
import { initRequest, withRateLimit, validateParams, validateNoPaginationConflict } from "@/lib/api-middleware";
import { apiPaginated, apiError, handleRouteError } from "@/lib/api-response";
import {
  decodeCursor,
  encodeCursor,
  validateCursor,
  hashFilters,
  CursorValidationError,
} from "@/lib/cursor";
import { ErrorCode, ERROR_STATUS } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  const { requestId } = initRequest();

  const rateLimit = await withRateLimit(request, "BROWSE", requestId);
  if (rateLimit instanceof Response) return rateLimit;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = validateParams(searchParams, SmallBodyQuerySchema, requestId);
  if (params instanceof Response) return params;

  // Strict: cursor + page can't coexist
  const conflict = validateNoPaginationConflict(params.data, requestId);
  if (conflict) return conflict;

  const useCursor = params.data.paginationMode === "cursor" || params.data.cursor !== undefined;

  try {
    if (useCursor) {
      // Offset-encoded cursor mode for SBDB
      // The cursor encodes the offset value, validated against sort/filter fingerprint
      const effectiveSort = "name"; // SBDB has a fixed sort
      const effectiveOrder = "asc" as const;
      const filterHash = await hashFilters(params.data as Record<string, unknown>);
      const limit = params.data.limit ?? 24;

      let page = 1;
      if (params.data.cursor) {
        const decoded = decodeCursor(params.data.cursor);
        if (!decoded) {
          throw new CursorValidationError("MALFORMED");
        }
        const validation = validateCursor(decoded, effectiveSort, effectiveOrder, filterHash);
        if (!validation.valid) {
          throw new CursorValidationError(validation.reason);
        }
        // Decode offset from cursor values — v[0] is the offset
        const offset = decoded.v[0] as number;
        page = Math.floor(offset / limit) + 1;
      }

      const result = await fetchSmallBodies({ ...params.data, page, limit });

      // Mint next cursor
      let nextCursor: string | undefined;
      if (result.hasMore) {
        const nextOffset = page * limit;
        nextCursor = encodeCursor({
          cv: 1,
          s: effectiveSort,
          o: effectiveOrder,
          f: filterHash,
          v: [nextOffset, 0],
          d: "n",
        });
      }

      return apiPaginated(result.objects, {
        mode: "cursor",
        limit: result.limit,
        hasMore: result.hasMore,
        ...(nextCursor ? { nextCursor } : {}),
      }, requestId, {
        "Cache-Control": getCacheControlHeader(CACHE_TTL.SMALL_BODIES_BROWSE),
        ...rateLimit.headers,
      });
    }

    // Offset mode (default)
    const result = await fetchSmallBodies({
      ...params.data,
      page: params.data.page ?? 1,
    });

    return apiPaginated(result.objects, {
      mode: "offset",
      page: result.page,
      limit: result.limit,
      total: result.total,
      hasMore: result.hasMore,
    }, requestId, {
      "Cache-Control": getCacheControlHeader(CACHE_TTL.SMALL_BODIES_BROWSE),
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
