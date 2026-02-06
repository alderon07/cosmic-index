import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from "./rate-limit";
import { apiError } from "./api-response";
import { ErrorCode, ERROR_STATUS } from "./api-errors";

// ═══════════════════════════════════════════════════════════════════════════════
// Request Initialization
// ═══════════════════════════════════════════════════════════════════════════════

/** Generate a unique request ID for tracing */
export function initRequest(): { requestId: string } {
  return { requestId: crypto.randomUUID() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitPass {
  headers: Record<string, string>;
}

/**
 * Check rate limit and return either:
 * - A `RateLimitPass` with headers to merge into the response, or
 * - A `NextResponse` (429) to return immediately.
 */
export async function withRateLimit(
  request: NextRequest,
  type: "BROWSE" | "DETAIL" | "SITEMAP",
  requestId: string,
): Promise<RateLimitPass | NextResponse> {
  const clientId = getClientIdentifier(request);
  const result = await checkRateLimit(clientId, type);

  if (!result.allowed) {
    const resetSeconds = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
    return apiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      "Rate limit exceeded. Please try again later.",
      ERROR_STATUS[ErrorCode.RATE_LIMIT_EXCEEDED],
      requestId,
      undefined,
      {
        ...getRateLimitHeaders(result, type),
        "Retry-After": resetSeconds.toString(),
      },
    );
  }

  return { headers: getRateLimitHeaders(result, type) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parameter Validation
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationPass<T> {
  data: T;
}

/**
 * Validate URL search params against a Zod schema.
 * Returns parsed data on success, or a 400 error response on failure.
 */
export function validateParams<T>(
  searchParams: Record<string, string>,
  schema: z.ZodType<T>,
  requestId: string,
): ValidationPass<T> | NextResponse {
  const result = schema.safeParse(searchParams);

  if (!result.success) {
    return apiError(
      ErrorCode.VALIDATION_ERROR,
      "Invalid query parameters.",
      ERROR_STATUS[ErrorCode.VALIDATION_ERROR],
      requestId,
      result.error.flatten(),
    );
  }

  return { data: result.data };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pagination Conflict Detection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check that cursor-mode signals and offset-mode signals are not mixed.
 *
 * Cursor-mode signals: `cursor`, `paginationMode=cursor`
 * Offset-mode signals: `page`, `paginationMode=offset`
 *
 * Returns a 400 error response on conflict, or null if valid.
 */
export function validateNoPaginationConflict(
  params: { cursor?: string; page?: number; paginationMode?: string },
  requestId: string,
): NextResponse | null {
  const wantsCursor = params.cursor !== undefined || params.paginationMode === "cursor";
  const wantsOffset = params.page !== undefined || params.paginationMode === "offset";

  if (wantsCursor && wantsOffset) {
    return apiError(
      ErrorCode.PAGINATION_CONFLICT,
      "Contradictory pagination: cannot combine cursor-mode signals (cursor, paginationMode=cursor) with offset-mode signals (page, paginationMode=offset). Use one or the other.",
      ERROR_STATUS[ErrorCode.PAGINATION_CONFLICT],
      requestId,
    );
  }

  return null;
}
