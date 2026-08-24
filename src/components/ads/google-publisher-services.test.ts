import { describe, expect, it } from "bun:test";
import {
  FooterAdUnit,
  getFooterAdVisibility,
  initializeAdsenseElement,
  shouldRenderSiteTelemetry,
} from "@/components/ads/google-publisher-services";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const baseState = {
  servingEnabled: true,
  routeEligible: true,
  hasNoAdsMarker: false,
  authLoaded: true,
  isSignedIn: false,
  eligibilityResolved: false,
  eligibilityFetching: false,
  canShowAds: false,
  publisherScriptReady: true,
};

describe("footer ad visibility", () => {
  it("allows anonymous visitors without an entitlement request", () => {
    expect(getFooterAdVisibility(baseState)).toBe(true);
  });

  it("removes an anonymous ad immediately when sign-in starts resolving", () => {
    expect(
      getFooterAdVisibility({
        ...baseState,
        isSignedIn: true,
        eligibilityFetching: true,
      })
    ).toBe(false);
  });

  it("allows only a resolved, non-refetching free-user result", () => {
    expect(
      getFooterAdVisibility({
        ...baseState,
        isSignedIn: true,
        eligibilityResolved: true,
        canShowAds: true,
      })
    ).toBe(true);

    expect(
      getFooterAdVisibility({
        ...baseState,
        isSignedIn: true,
        eligibilityResolved: true,
        eligibilityFetching: true,
        canShowAds: true,
      })
    ).toBe(false);
  });

  it.each([
    { servingEnabled: false },
    { routeEligible: false },
    { hasNoAdsMarker: true },
    { authLoaded: false },
    { publisherScriptReady: false },
    { isSignedIn: true, eligibilityResolved: true, canShowAds: false },
  ])("fails closed for %o", (override) => {
    expect(getFooterAdVisibility({ ...baseState, ...override })).toBe(false);
  });
});

describe("privacy telemetry exclusion", () => {
  it("omits all site telemetry on privacy documents", () => {
    expect(shouldRenderSiteTelemetry("/privacy")).toBe(false);
    expect(shouldRenderSiteTelemetry("/privacy/choices")).toBe(false);
    expect(shouldRenderSiteTelemetry("/")).toBe(true);
  });
});

describe("manual AdSense unit", () => {
  it("renders one responsive unit with the permitted label", () => {
    const html = renderToStaticMarkup(
      createElement(FooterAdUnit, {
        clientId: "ca-pub-1234567890123456",
        slotId: "1234567890",
      })
    );

    expect(html).toContain('<aside aria-label="Advertisements"');
    expect(html).toContain(">Advertisements</h2>");
    expect(html.match(/class="adsbygoogle/g)).toHaveLength(1);
    expect(html).toContain('data-ad-format="auto"');
    expect(html).toContain('data-full-width-responsive="true"');
  });

  it("initializes a visible element exactly once", () => {
    let pushes = 0;
    const element = {
      isConnected: true,
      dataset: {},
      getBoundingClientRect: () => ({ width: 728 }),
    } as unknown as HTMLElement;

    expect(initializeAdsenseElement(element, () => pushes++)).toBe(true);
    expect(initializeAdsenseElement(element, () => pushes++)).toBe(false);
    expect(pushes).toBe(1);
    expect(element.dataset.adsbygoogleInitialized).toBe("true");
  });

  it("waits for a non-zero container width", () => {
    const element = {
      isConnected: true,
      dataset: {},
      getBoundingClientRect: () => ({ width: 0 }),
    } as unknown as HTMLElement;

    expect(initializeAdsenseElement(element, () => undefined)).toBe(false);
  });
});
