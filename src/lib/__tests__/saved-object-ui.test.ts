import { describe, expect, it } from "bun:test";
import { isEventObject, parseCanonicalId } from "@/lib/canonical-id";
import {
  formatSavedObjectTypeBadge,
  getSavedObjectType,
  resolveSavedObjectHref,
} from "@/lib/saved-object-ui";

describe("expanded space weather saved object support", () => {
  it("parses IPS/HSS/SEP canonical ids as event objects", () => {
    expect(parseCanonicalId("ips:abc123")).toEqual({ type: "ips", id: "abc123" });
    expect(parseCanonicalId("hss:def456")).toEqual({ type: "hss", id: "def456" });
    expect(parseCanonicalId("sep:ghi789")).toEqual({ type: "sep", id: "ghi789" });
    expect(isEventObject("ips:abc123")).toBe(true);
    expect(isEventObject("hss:def456")).toBe(true);
    expect(isEventObject("sep:ghi789")).toBe(true);
  });

  it("routes all saved space weather events to the moved events browser", () => {
    expect(resolveSavedObjectHref("flr:abc123")).toBe("/space-weather/events");
    expect(resolveSavedObjectHref("cme:abc123")).toBe("/space-weather/events");
    expect(resolveSavedObjectHref("gst:abc123")).toBe("/space-weather/events");
    expect(resolveSavedObjectHref("ips:abc123")).toBe("/space-weather/events");
    expect(resolveSavedObjectHref("hss:abc123")).toBe("/space-weather/events");
    expect(resolveSavedObjectHref("sep:abc123")).toBe("/space-weather/events");
  });

  it("exposes labels for the added DONKI event types", () => {
    expect(getSavedObjectType("ips:abc123")).toBe("ips");
    expect(getSavedObjectType("hss:abc123")).toBe("hss");
    expect(getSavedObjectType("sep:abc123")).toBe("sep");
    expect(formatSavedObjectTypeBadge("ips")).toBe("Interplanetary Shock");
    expect(formatSavedObjectTypeBadge("hss")).toBe("High-Speed Stream");
    expect(formatSavedObjectTypeBadge("sep")).toBe("SEP");
  });
});
