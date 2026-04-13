import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { LearnBlock } from "@/components/space-weather/learn-block";

describe("LearnBlock", () => {
  it("keeps card chrome for standalone educational panels", () => {
    const html = renderToStaticMarkup(
      <LearnBlock
        title="Standalone"
        explanation="Overview copy."
        impact="Why it matters."
        defaultOpen
        theme="stars"
      />,
    );

    expect(html).toContain('data-variant="card"');
    expect(html).toContain('data-theme="stars"');
    expect(html).toContain("rounded-xl border border-uranium-green/20");
    expect(html).toContain("border-uranium-green/12");
    expect(html).toContain("pt-3");
  });

  it("uses the lighter inline treatment for embedded educational rows", () => {
    const html = renderToStaticMarkup(
      <LearnBlock
        title="Embedded"
        explanation="Inline copy."
        impact="Why it matters."
        variant="inline"
        defaultOpen
        theme="close-approaches"
      />,
    );

    expect(html).toContain('data-variant="inline"');
    expect(html).toContain('data-theme="close-approaches"');
    expect(html).toContain("rounded-none border-x-0 border-b-0 border-t border-destructive/15");
    expect(html).not.toContain("bg-aurora-violet/[0.04]");
    expect(html).toContain("border-destructive/12");
    expect(html).toContain("pt-3");
  });
});
