/**
 * Frontend API client shim.
 *
 * Wraps fetch calls to /api/v1/ and unwraps the new { data, pagination, meta }
 * envelope back to the legacy shapes that page components currently expect.
 *
 * TODO: Migrate page components to consume { data, pagination, meta } directly,
 * then remove this shim.
 */

export const API_BASE = "/api/v1";

/** Unwrapped paginated result (matches legacy PaginatedResponse<T> shape + cursor fields) */
export interface PaginatedResult<T> {
  objects: T[];
  total?: number;
  page?: number;
  limit: number;
  hasMore: boolean;
  mode: "offset" | "cursor" | "none";
  nextCursor?: string;
}

/** Unwrapped event-stream result */
export interface EventStreamResult<T> {
  events: T[];
  count: number;
  meta: Record<string, unknown>;
}

/**
 * Fetch a single resource from the API.
 * Unwraps `{ data }` envelope → returns `data` directly.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message ?? body?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  const json = await response.json();
  // If the response has a `data` envelope, unwrap it.
  // Otherwise return as-is (for backward compat during migration).
  return json.data !== undefined ? json.data : json;
}

/**
 * Fetch a paginated resource from the API.
 * Unwraps `{ data, pagination }` envelope → returns legacy-shaped result.
 */
export async function apiFetchPaginated<T>(
  path: string,
  init?: RequestInit,
): Promise<PaginatedResult<T>> {
  const response = await fetch(`${API_BASE}${path}`, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message ?? body?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  const json = await response.json();

  // New envelope format: { data, pagination, meta }
  if (json.pagination) {
    const pag = json.pagination;
    return {
      objects: json.data,
      total: pag.total,
      page: pag.page,
      limit: pag.limit ?? json.data.length,
      hasMore: pag.hasMore,
      mode: pag.mode,
      nextCursor: pag.nextCursor,
    };
  }

  // Legacy format fallback (shouldn't happen after migration, but safe)
  return {
    objects: json.objects ?? json.data ?? [],
    total: json.total,
    page: json.page,
    limit: json.limit ?? 24,
    hasMore: json.hasMore ?? false,
    mode: "offset",
  };
}

/**
 * Fetch an event-stream resource from the API.
 * Unwraps `{ data, pagination: { mode: "none" }, meta }` → returns legacy event shape.
 */
export async function apiFetchEvents<T>(
  path: string,
  init?: RequestInit,
): Promise<EventStreamResult<T>> {
  const response = await fetch(`${API_BASE}${path}`, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message ?? body?.error ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  const json = await response.json();

  // New envelope: { data, pagination: { mode: "none" }, meta: { count, ... } }
  if (json.pagination?.mode === "none") {
    return {
      events: json.data,
      count: json.meta?.count ?? json.data.length,
      meta: json.meta ?? {},
    };
  }

  // Legacy format fallback
  return {
    events: json.events ?? json.data ?? [],
    count: json.count ?? json.events?.length ?? 0,
    meta: json.meta ?? {},
  };
}
