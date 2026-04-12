import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import WaitlistPage, { metadata } from "@/app/waitlist/page";

describe("WaitlistPage", () => {
  it("renders a retired waitlist page instead of redirecting", () => {
    const html = renderToStaticMarkup(<WaitlistPage />);

    expect(html).toContain("Waitlist Retired");
    expect(html).toContain("/settings/billing");
  });

  it("marks the retired page as noindex", () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
