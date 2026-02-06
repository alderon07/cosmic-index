/**
 * Error code catalog for the Cosmic Index API.
 *
 * These codes appear in the `error.code` field of error responses.
 * Clients should switch on this field — not on HTTP status codes or messages —
 * because a single status code (e.g. 400) can map to multiple error codes.
 */
export const ErrorCode = {
  // Client errors
  VALIDATION_ERROR: "VALIDATION_ERROR",        // 400 — Zod parse failure, invalid params
  INVALID_DATE_RANGE: "INVALID_DATE_RANGE",    // 400 — business logic (e.g., future APOD date)
  PAGINATION_CONFLICT: "PAGINATION_CONFLICT",  // 400 — cursor + page both provided
  NOT_FOUND: "NOT_FOUND",                      // 404
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",    // 405 — wrong HTTP method
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",  // 429

  // Auth (for future use, define now so the enum is stable)
  UNAUTHORIZED: "UNAUTHORIZED",                // 401
  FORBIDDEN: "FORBIDDEN",                      // 403

  // Server errors
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE", // 503 — NASA/JPL/CNEOS/DONKI timeout or 5xx
  INDEX_UNAVAILABLE: "INDEX_UNAVAILABLE",       // 503 — Turso index down
  CONTRACT_MISMATCH: "CONTRACT_MISMATCH",       // 502 — upstream API changed response shape
  INTERNAL_ERROR: "INTERNAL_ERROR",             // 500 — catch-all
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Map each error code to its canonical HTTP status */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_DATE_RANGE]: 400,
  [ErrorCode.PAGINATION_CONFLICT]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.UPSTREAM_UNAVAILABLE]: 503,
  [ErrorCode.INDEX_UNAVAILABLE]: 503,
  [ErrorCode.CONTRACT_MISMATCH]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
};
