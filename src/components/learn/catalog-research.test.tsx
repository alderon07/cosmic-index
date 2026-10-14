import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogResearch } from "./catalog-research";

describe("catalog research notes", () => {
  it.each(["TRAPPIST-1 b", "TRAPPIST-1 e"])("renders sourced interpretation for %s without fetching", (name) => {
    const html = renderToStaticMarkup(<CatalogResearch name={name} />);
    expect(html).toContain("Research notes");
    expect(html).toContain('dateTime="2026-10-14"');
    expect(html).toContain('href="/learn/trappist-1-comparison"');
    expect(html).toContain("https://science.nasa.gov/");
    expect(html).toContain("<h3");
  });
  it.each(["Other planet", "constructor", "__proto__"])("does not invent notes for %s", (name) => {
    expect(renderToStaticMarkup(<CatalogResearch name={name} />)).toBe("");
  });
});
