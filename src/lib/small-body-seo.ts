import type { SmallBodyData } from "@/lib/types";
import { shouldIndexCatalogDetail } from "@/lib/catalog-index-policy";

export function shouldIndexSmallBody(smallBody: SmallBodyData): boolean {
  return shouldIndexCatalogDetail("small-body", smallBody.id);
}
