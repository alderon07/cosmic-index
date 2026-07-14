import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProFeaturesList } from "@/components/pro-features-list";

describe("ProFeaturesList", () => {
  it("describes the My Observatory upgrade without hiding the Free allowance", () => {
    const html = renderToStaticMarkup(<ProFeaturesList tier="free" />);

    expect(html).toContain("My Observatory");
    expect(html).toContain("50 Watches");
    expect(html).toContain("180 days");
    expect(html).toContain("Free includes one Watch and 30 days");
    expect(html).not.toContain("Custom event alerts");
  });

  it("renders descriptions for every Pro benefit", () => {
    const html = renderToStaticMarkup(<ProFeaturesList tier="pro" />);

    expect(html).toContain("Store up to 1,500 saved objects");
    expect(html).toContain("Download JSON, NDJSON, and CSV exports");
  });
});
