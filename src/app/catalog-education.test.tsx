import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

mock.module("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => "/",
}));

mock.module("next/dynamic", () => ({
  default: () => () => null,
}));

mock.module("@tanstack/react-query", () => ({
  useQuery: (options?: { initialData?: unknown }) => ({
    data: options?.initialData ?? null,
    isPending: false,
    error: null,
  }),
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
}));

mock.module("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: () => {},
}));

mock.module("@/lib/list-url-store", () => ({
  saveListUrl: () => {},
}));

mock.module("@/components/object-card", () => ({
  ObjectCard: () => <div>Object card</div>,
  ObjectCardSkeleton: () => <div>Object skeleton</div>,
}));

mock.module("@/components/search-bar", () => ({
  SearchBar: () => <div>Search bar</div>,
}));

mock.module("@/components/filter-panel", () => ({
  ExoplanetFilterPanel: () => <div>Exoplanet filters</div>,
  SmallBodyFilterPanel: () => <div>Small body filters</div>,
}));

mock.module("@/components/star-filter-panel", () => ({
  StarFilterPanel: () => <div>Star filters</div>,
}));

mock.module("@/components/pagination", () => ({
  Pagination: () => <div>Pagination</div>,
  PaginationInfo: () => <div>Pagination info</div>,
}));

mock.module("@/components/view-toggle", () => ({
  ViewToggle: () => <div>View toggle</div>,
}));

mock.module("@/components/saved-search-controls", () => ({
  SavedSearchControls: () => <div>Saved searches</div>,
}));

mock.module("@/components/export-button", () => ({
  ExportButton: () => <div>Export</div>,
}));

mock.module("@/components/fireball-card", () => ({
  FireballCard: () => <div>Fireball card</div>,
  FireballCardSkeleton: () => <div>Fireball skeleton</div>,
}));

mock.module("@/components/close-approach-card", () => ({
  CloseApproachCard: () => <div>Close approach card</div>,
  CloseApproachCardSkeleton: () => <div>Close approach skeleton</div>,
}));

mock.module("@/components/timeline/event-timeline", () => ({
  EventTimeline: () => <div>Timeline</div>,
}));

const { ExoplanetsPageClient } = await import("@/app/exoplanets/exoplanets-page-client");
const { StarsPageClient } = await import("@/app/stars/stars-page-client");
const { SmallBodiesPageClient } = await import("@/app/small-bodies/small-bodies-page-client");
const { FireballsPageClient } = await import("@/app/fireballs/fireballs-page-client");
const { CloseApproachesPageClient } = await import("@/app/close-approaches/close-approaches-page-client");

describe("catalog education placement", () => {
  it("adds a learn block to the exoplanets browse page", () => {
    const html = renderToStaticMarkup(
      <ExoplanetsPageClient initialData={null} initialError={null} initialFetchKey="" />,
    );

    expect(html).toContain("How to read exoplanet data");
    expect(html).toContain("Most exoplanet entries are incomplete");
    expect(html).toContain('href="/learn/comparing-exoplanets"');
  });

  it("adds a learn block to the stars browse page", () => {
    const html = renderToStaticMarkup(
      <StarsPageClient initialData={null} initialError={null} initialFetchKey="" />,
    );

    expect(html).toContain("How to read host star data");
  });

  it("adds a learn block to the small-bodies browse page", () => {
    const html = renderToStaticMarkup(
      <SmallBodiesPageClient initialData={null} initialError={null} initialFetchKey="" />,
    );

    expect(html).toContain("How to read small-body hazard labels");
  });

  it("adds a learn block to the fireballs browse page", () => {
    const html = renderToStaticMarkup(
      <FireballsPageClient initialData={null} initialError={null} initialFetchKey="" />,
    );

    expect(html).toContain("How to read fireball reports");
  });

  it("adds a learn block to the close-approaches browse page", () => {
    const html = renderToStaticMarkup(
      <CloseApproachesPageClient initialData={null} initialError={null} initialFetchKey="" />,
    );

    expect(html).toContain("How to read close-approach risk data");
  });
});
