import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { APODCard } from "@/components/apod-card";
import type { APODData } from "@/lib/types";

describe("APOD availability", () => {
  it("keeps a useful source link visible when the feed fails", () => {
    const html = renderToStaticMarkup(
      <APODCard initialError="Private upstream error details" />,
    );

    expect(html).toContain("Today&#x27;s picture is unavailable");
    expect(html).toContain('href="https://science.nasa.gov/apod/"');
    expect(html).toContain("View on NASA APOD");
    expect(html).not.toContain("Private upstream error details");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<iframe");
  });

  it("retains the daily image, explanation, credit, and dated source when available", () => {
    const apod: APODData = {
      date: "2026-10-05",
      title: "A test galaxy",
      explanation: "An upstream astronomy explanation.",
      imageUrl: "https://apod.nasa.gov/apod/image/test.jpg",
      mediaType: "image",
      copyright: "Test photographer",
    };
    const html = renderToStaticMarkup(<APODCard initialApod={apod} />);

    expect(html).toContain("A test galaxy");
    expect(html).toContain(apod.explanation);
    expect(html).toContain("Test photographer");
    expect(html).toContain('href="https://apod.nasa.gov/apod/ap261005.html"');
    expect(html).not.toContain("Today&#x27;s picture is unavailable");
  });
});
