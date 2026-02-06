import { NextResponse } from "next/server";
import { ErrorCode, ERROR_STATUS } from "./api-errors";
import { ExoplanetIndexUnavailableError } from "./exoplanet-index";
import { isContractMismatch, isUpstreamFailure } from "./jpl-sbdb";

// ═══════════════════════════════════════════════════════════════════════════════
// Response Envelope Types
// ═══════════════════════════════════════════════════════════════════════════════

export const API_VERSION = "1";

export interface ApiMeta {
  requestId: string;
  apiVersion: string;
  timestamp: string;
  [key: string]: unknown;
}

/** Standard success envelope (detail endpoints) */
export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

// ── Pagination (discriminated union on `mode`) ──────────────────────────────

export type PaginationMode = "offset" | "cursor" | "none";

export interface OffsetPagination {
  mode: "offset";
  page: number;
  limit: number;
  total?: number;
  hasMore: boolean;
}

export interface CursorPagination {
  mode: "cursor";
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NonePagination {
  mode: "none";
  hasMore: false;
}

export type Pagination = OffsetPagination | CursorPagination | NonePagination;

/** Paginated success envelope (browse + event-stream endpoints) */
export interface ApiPaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
  meta: ApiMeta;
}

// ── Error Envelope ──────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Base Headers
// ═══════════════════════════════════════════════════════════════════════════════

function baseHeaders(requestId: string): Record<string, string> {
  return {
    "X-Request-Id": requestId,
    "Api-Version": API_VERSION,
    "Vary": "Accept-Encoding",
  };
}

function buildMeta(requestId: string, extra?: Record<string, unknown>): ApiMeta {
  return {
    requestId,
    apiVersion: API_VERSION,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Response Builders
// ═══════════════════════════════════════════════════════════════════════════════

/** Build a standard success response (detail endpoints) */
export function apiSuccess<T>(
  data: T,
  requestId: string,
  headers?: Record<string, string>,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      meta: buildMeta(requestId),
    },
    {
      headers: { ...baseHeaders(requestId), ...headers },
    },
  );
}

/** Build a paginated success response (browse + event endpoints) */
export function apiPaginated<T>(
  data: T[],
  pagination: Pagination,
  requestId: string,
  headers?: Record<string, string>,
  extraMeta?: Record<string, unknown>,
): NextResponse<ApiPaginatedResponse<T>> {
  return NextResponse.json(
    {
      data,
      pagination,
      meta: buildMeta(requestId, extraMeta),
    },
    {
      headers: { ...baseHeaders(requestId), ...headers },
    },
  );
}

/** Build a standard error response */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  requestId: string,
  details?: unknown,
  headers?: Record<string, string>,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      meta: buildMeta(requestId),
    },
    {
      status,
      headers: { ...baseHeaders(requestId), ...headers },
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Centralized Error Classification
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify an unknown error from a route handler into an appropriate API error response.
 * This replaces the per-route try/catch boilerplate.
 */
export function handleRouteError(
  error: unknown,
  requestId: string,
  headers?: Record<string, string>,
): NextResponse {
  const message = error instanceof Error ? error.message : "Unknown error";
  const errorType = error instanceof Error ? error.constructor.name : "Unknown";

  // Log full context server-side
  console.error(`[${requestId}] Route error:`, {
    type: errorType,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // 1. Turso index unavailable
  if (error instanceof ExoplanetIndexUnavailableError) {
    return apiError(
      ErrorCode.INDEX_UNAVAILABLE,
      "Index is temporarily unavailable. Please try again later.",
      ERROR_STATUS[ErrorCode.INDEX_UNAVAILABLE],
      requestId,
      undefined,
      { ...headers, "Retry-After": "60" },
    );
  }

  // 2. Upstream failure (5xx/timeout from NASA/JPL/CNEOS/DONKI)
  if (isUpstreamFailure(error)) {
    return apiError(
      ErrorCode.UPSTREAM_UNAVAILABLE,
      "Upstream data source is temporarily unavailable. Please try again.",
      ERROR_STATUS[ErrorCode.UPSTREAM_UNAVAILABLE],
      requestId,
      undefined,
      { ...headers, "Retry-After": "60" },
    );
  }

  // 3. Contract mismatch (upstream changed their response shape)
  if (isContractMismatch(error)) {
    console.warn(`[${requestId}] Contract mismatch:`, message);
    return apiError(
      ErrorCode.CONTRACT_MISMATCH,
      "Upstream API response format has changed. This is being investigated.",
      ERROR_STATUS[ErrorCode.CONTRACT_MISMATCH],
      requestId,
      undefined,
      headers,
    );
  }

  // 4. Request cancelled/aborted — normal client behavior
  if (message.includes("cancelled") || message.includes("aborted")) {
    // Log at debug level, not error — this is expected
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${requestId}] Request cancelled/aborted`);
    }
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      "Request was cancelled.",
      500,
      requestId,
      undefined,
      headers,
    );
  }

  // 5. Timeout
  if (message.includes("timed out")) {
    return apiError(
      ErrorCode.UPSTREAM_UNAVAILABLE,
      "Request timed out. The upstream data source may be slow.",
      ERROR_STATUS[ErrorCode.UPSTREAM_UNAVAILABLE],
      requestId,
      undefined,
      { ...headers, "Retry-After": "60" },
    );
  }

  // 6. Rate limit from upstream (e.g., NASA API key exhausted)
  if (message.includes("rate limit")) {
    return apiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      "Upstream rate limit exceeded. Please try again later.",
      ERROR_STATUS[ErrorCode.RATE_LIMIT_EXCEEDED],
      requestId,
      undefined,
      { ...headers, "Retry-After": "60" },
    );
  }

  // 7. Catch-all
  return apiError(
    ErrorCode.INTERNAL_ERROR,
    "An unexpected error occurred. Please try again later.",
    ERROR_STATUS[ErrorCode.INTERNAL_ERROR],
    requestId,
    undefined,
    headers,
  );
}
