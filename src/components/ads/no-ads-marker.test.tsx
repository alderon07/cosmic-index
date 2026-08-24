import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NoAdsMarker } from "@/components/ads/no-ads-marker";

describe("NoAdsMarker", () => {
  it("renders a reusable hidden document marker", () => {
    const html = renderToStaticMarkup(<NoAdsMarker />);

    expect(html).toContain("data-no-ads");
    expect(html).toContain("hidden");
    expect(html).toContain('aria-hidden="true"');
  });
});
