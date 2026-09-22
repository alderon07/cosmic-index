export type CatalogDetailKind = "exoplanet" | "star" | "small-body";

// Catalog records are assembled from upstream scientific datasets. Keep them
// available to people using the catalog, but do not submit them to Search until
// a record has a manually reviewed, first-party editorial treatment.
//
// Add a canonical, URL-encoded record ID only after that review is published on
// the detail page. The same list controls robots metadata and sitemap output so
// the two signals cannot drift apart.
const CURATED_CATALOG_IDS = {
  exoplanet: [],
  star: [],
  "small-body": [],
} as const satisfies Record<CatalogDetailKind, readonly string[]>;

function normalizeCatalogId(id: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(id).normalize("NFKC").trim());
  } catch {
    return encodeURIComponent(id.normalize("NFKC").trim());
  }
}

export function shouldIndexCatalogDetail(
  kind: CatalogDetailKind,
  id: string,
): boolean {
  const normalizedId = normalizeCatalogId(id);
  const curatedIds: readonly string[] = CURATED_CATALOG_IDS[kind];
  return curatedIds.includes(normalizedId);
}

export function getCuratedCatalogPaths(kind: CatalogDetailKind): string[] {
  const prefix = kind === "small-body" ? "small-bodies" : `${kind}s`;
  return CURATED_CATALOG_IDS[kind].map((id) => `/${prefix}/${id}`);
}
