import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage, { metadata } from "@/app/privacy/page";

describe("PrivacyPage", () => {
  it("documents account, billing, storage, telemetry, advertising, and choices", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("August 24, 2026");
    expect(html).toContain("Clerk");
    expect(html).toContain("Stripe");
    expect(html).toContain("Turso");
    expect(html).toContain("Upstash");
    expect(html).toContain("Vercel Analytics");
    expect(html).toContain("Google Analytics");
    expect(html).toContain("Google AdSense");
    expect(html).toContain("under 13");
    expect(html).toContain("personal information");
    expect(html).toContain("github.com");
  });

  it("publishes canonical privacy metadata", () => {
    expect(metadata.title).toBe("Privacy Policy");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/privacy",
    });
  });
});
