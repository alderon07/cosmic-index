import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("offers random object navigation alongside the catalog actions", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("Random Object");
    expect(html).toContain('href="/random-object"');
    expect(html).toContain("Start with Exoplanets");
    expect(html).toContain("Browse Stars");
    expect(html).toContain("Track Small Bodies");
  });
});
