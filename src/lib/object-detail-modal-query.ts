import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./api-client";
import { queryKeys } from "./query-keys";
import {
  StarDataSchema,
  isStar,
  type AnyCosmicObject,
  type StarData,
} from "./types";

export const MODAL_STAR_DETAIL_STALE_TIME_MS = 24 * 60 * 60 * 1_000;
export const MODAL_STAR_DETAIL_GC_TIME_MS = 60 * 60 * 1_000;

export function getModalStarDetailQueryOptions(
  object: AnyCosmicObject | null,
  open: boolean,
) {
  const star = object && isStar(object) ? object : null;

  return queryOptions<StarData>({
    queryKey: queryKeys.starDetail(star?.id ?? "inactive"),
    queryFn: async ({ signal }) => {
      if (!star) throw new Error("Star detail requested without a star");
      const response = await apiFetch<unknown>(`/stars/${star.id}`, { signal });
      return StarDataSchema.parse(response);
    },
    enabled: open && star !== null,
    staleTime: MODAL_STAR_DETAIL_STALE_TIME_MS,
    gcTime: MODAL_STAR_DETAIL_GC_TIME_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function resolveModalDetailObject(
  object: AnyCosmicObject,
  starDetail: StarData | undefined,
): AnyCosmicObject {
  return isStar(object) && starDetail?.id === object.id ? starDetail : object;
}
