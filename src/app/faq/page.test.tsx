import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import FaqPage, { metadata } from "@/app/faq/page";

describe("FaqPage", () => {
  it("renders the faq sections and supported breadcrumb structured data", () => {
    const html = renderToStaticMarkup(<FaqPage />);

    expect(html).toContain("Frequently Asked Questions");
    expect(html).toContain("What is Cosmic Index?");
    expect(html).toContain("What does southward Bz mean for geomagnetic storms?");
    expect(html).toContain("Does a habitable exoplanet label mean a planet is definitely life-friendly?");
    expect(html).not.toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain("https://cosmicindex.dev/faq");
    expect(html).toContain("/space-weather");
    expect(html).toContain("/exoplanets");
  });

  it("publishes canonical metadata for the faq route", () => {
    expect(metadata.title).toBe("FAQ");
    expect(metadata.description).toContain("Frequently asked questions about Cosmic Index");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/faq",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://cosmicindex.dev/faq",
      title: "FAQ | Cosmic Index",
    });
  });
});
