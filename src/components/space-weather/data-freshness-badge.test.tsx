import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/space-weather/format", () => ({
  formatRelativeTime: (generatedAt: string | null | undefined) => {
    if (!generatedAt) {
      return "Unknown";
    }

    return "5 minutes ago";
  },
}));

import { DataFreshnessBadge } from "@/components/space-weather/data-freshness-badge";

describe("DataFreshnessBadge", () => {
  it("renders the derived freshness label when idle", () => {
    const html = renderToStaticMarkup(
      <DataFreshnessBadge generatedAt="2026-04-12T12:00:00.000Z" />,
    );

    expect(html).toContain("Updated 5 minutes ago");
    expect(html).not.toContain("Refreshing...");
  });

  it("renders the refreshing state when a fetch is in flight", () => {
    const html = renderToStaticMarkup(
      <DataFreshnessBadge
        generatedAt="2026-04-12T12:00:00.000Z"
        isFetching
      />,
    );

    expect(html).toContain("Refreshing...");
    expect(html).toContain("animate-spin");
  });
});
