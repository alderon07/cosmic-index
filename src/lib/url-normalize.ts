import { ReadonlyURLSearchParams } from "next/navigation";

export type SearchParamUpdates = Record<string, string | null>;

export function applySearchParamUpdates(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
  updates: SearchParamUpdates
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  return params;
}

export function buildPathWithSearch(
  pathname: string,
  searchParams: URLSearchParams
): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isNoopUrlUpdate(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
  updates: SearchParamUpdates
): boolean {
  const current = searchParams.toString();
  const next = applySearchParamUpdates(searchParams, updates).toString();
  return current === next;
}
