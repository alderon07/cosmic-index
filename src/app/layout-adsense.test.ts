import { describe, expect, it } from "bun:test";

describe("root AdSense placement", () => {
  it("places publisher services after the footer and uses a native privacy link", async () => {
    const source = await Bun.file(new URL("./layout.tsx", import.meta.url)).text();
    const footerEnd = source.indexOf("</footer>");
    const publisherServices = source.indexOf("<GooglePublisherServices");

    expect(footerEnd).toBeGreaterThan(-1);
    expect(publisherServices).toBeGreaterThan(footerEnd);
    expect(source).toContain('<a href="/privacy"');
    expect(source).not.toContain('<Link href="/privacy"');
  });
});
