import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FireballFilterContext } from "./fireball-filter-context";

describe("fireball filter interpretation", () => {
  it("explains the unfiltered result window without claiming a census", () => {
    const html = renderToStaticMarkup(<FireballFilterContext reqLoc={false} reqAlt={false} reqVel={false} />);
    expect(html).toContain("No measurement requirements are active");
    expect(html).toContain("at most 100 records");
    expect(html).toContain('href="/learn/fireball-selection"');
    expect(html).not.toContain("Velocity required");
  });
  it("explains each active requirement without inventing excluded counts", () => {
    const html = renderToStaticMarkup(<FireballFilterContext reqLoc reqAlt reqVel />);
    expect(html).toContain("Location required");
    expect(html).toContain("Altitude required");
    expect(html).toContain("Velocity required");
    expect(html).toContain("Every active requirement must be met");
    expect(html).not.toContain("11 records");
  });
});
