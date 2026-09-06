import { describe, expect, it } from "bun:test";
import {
  getAdsenseConfig,
  getAdsTxtLine,
  isAdEligiblePath,
} from "@/lib/adsense";

const VALID_CLIENT_ID = "ca-pub-1234567890123456";
const VALID_SLOT_ID = "1234567890";

describe("AdSense configuration", () => {
  it("requires an explicit flag and valid client and slot IDs to serve ads", () => {
    expect(
      getAdsenseConfig({
        GOOGLE_ADSENSE_ENABLED: "true",
        GOOGLE_ADSENSE_CLIENT_ID: VALID_CLIENT_ID,
        GOOGLE_ADSENSE_FOOTER_SLOT_ID: VALID_SLOT_ID,
      })
    ).toEqual({
      enabled: true,
      clientId: VALID_CLIENT_ID,
      footerSlotId: VALID_SLOT_ID,
    });

    expect(
      getAdsenseConfig({
        GOOGLE_ADSENSE_ENABLED: "false",
        GOOGLE_ADSENSE_CLIENT_ID: VALID_CLIENT_ID,
        GOOGLE_ADSENSE_FOOTER_SLOT_ID: VALID_SLOT_ID,
      }).enabled
    ).toBe(false);
  });

  it.each([
    "pub-1234567890123456",
    "ca-pub-123",
    "ca-pub-12345678901234567",
    " ca-pub-1234567890123456",
    "ca-pub-1234567890123456 ",
    "ca-pub-1234567890123456<script>",
  ])("rejects malformed client ID %s", (clientId) => {
    const config = getAdsenseConfig({
      GOOGLE_ADSENSE_ENABLED: "true",
      GOOGLE_ADSENSE_CLIENT_ID: clientId,
      GOOGLE_ADSENSE_FOOTER_SLOT_ID: VALID_SLOT_ID,
    });

    expect(config.clientId).toBeNull();
    expect(config.enabled).toBe(false);
  });

  it.each(["123", "12345678901", " 1234567890", "12345<script>"])(
    "rejects malformed slot ID %s",
    (slotId) => {
      const config = getAdsenseConfig({
        GOOGLE_ADSENSE_ENABLED: "true",
        GOOGLE_ADSENSE_CLIENT_ID: VALID_CLIENT_ID,
        GOOGLE_ADSENSE_FOOTER_SLOT_ID: slotId,
      });

      expect(config.footerSlotId).toBeNull();
      expect(config.enabled).toBe(false);
    }
  );

  it("keeps a valid client ID for ownership metadata while serving is disabled", () => {
    expect(
      getAdsenseConfig({
        GOOGLE_ADSENSE_CLIENT_ID: VALID_CLIENT_ID,
      })
    ).toEqual({
      enabled: false,
      clientId: VALID_CLIENT_ID,
      footerSlotId: null,
    });
  });

  it("derives the authorized ads.txt record", () => {
    expect(getAdsTxtLine(VALID_CLIENT_ID)).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0"
    );
    expect(getAdsTxtLine("invalid")).toBeNull();
  });
});

describe("AdSense route allowlist", () => {
  it.each([
    "/",
    "/learn/comparing-exoplanets",
    "/learn/reading-space-weather",
    "/learn/understanding-asteroid-flybys",
  ])("allows %s", (pathname) => {
    expect(isAdEligiblePath(pathname)).toBe(true);
  });

  it.each([
    "/exoplanets",
    "/exoplanets/kepler-22-b",
    "/stars",
    "/stars/sun",
    "/small-bodies",
    "/small-bodies/99942-apophis",
    "/close-approaches",
    "/fireballs",
    "/space-weather",
    "/space-weather/alerts",
    "/space-weather/solar",
    "/space-weather/unknown-event",
    "/learn",
    "/learn/unpublished-guide",
    "/learn/comparing-exoplanets/extra",
    "/learn/comparing-exoplanets/",
    "/faq",
    "/privacy",
    "/waitlist",
    "/user",
    "/user/saved-objects",
    "/settings/billing",
    "/api/v1/exoplanets",
    "/docs",
    "/sitemap.xml",
    "/future-route",
    "/exoplanets-archive",
  ])("excludes %s by default", (pathname) => {
    expect(isAdEligiblePath(pathname)).toBe(false);
  });
});
