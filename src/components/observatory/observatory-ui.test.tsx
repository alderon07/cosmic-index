import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ObservatoryShell } from "@/components/observatory/observatory-shell";
import { ObservatoryEmptyState } from "@/components/observatory/observatory-states";
import { SignalCard } from "@/components/observatory/signal-card";
import { horizonBucket } from "@/components/observatory/overview-client";
import { SignalsResponseSchema, WatchesResponseSchema } from "@/components/observatory/types";

describe("Observatory UI", () => {
  it("renders accessible route navigation", () => {
    const html = renderToStaticMarkup(
      <ObservatoryShell active="overview">
        <p>Dashboard</p>
      </ObservatoryShell>,
    );

    expect(html).toContain("My Observatory");
    expect(html).toContain('aria-label="Observatory sections"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Here is what is happening in your corner of space.");
  });

  it("explains an empty watch list with one clear action", () => {
    const html = renderToStaticMarkup(
      <ObservatoryEmptyState
        kind="watches"
        action={<button type="button">Make my first watch</button>}
      />,
    );

    expect(html).toContain("Nothing is being watched yet");
    expect(html).toContain("Make my first watch");
  });

  it("does not rely on color alone for a signal", () => {
    const html = renderToStaticMarkup(
      <SignalCard
        signal={{
          id: 9,
          alertId: 4,
          title: "Strong solar storm",
          summary: "A strong storm was reported.",
          matchReason: "This matched your Strong storms watch.",
          severity: "strong",
          source: "donki",
          triggerKey: "space-weather:donki:9",
          eventType: "gst",
          destinationUrl: "/space-weather/gst-9",
          sourceUrl: null,
          sourceLabel: "NASA DONKI",
          eventAt: "2026-07-12T12:00:00.000Z",
          sourceAt: "2026-07-12T12:00:00.000Z",
          snapshot: {},
          createdAt: "2026-07-12T12:05:00.000Z",
          updatedAt: "2026-07-12T12:05:00.000Z",
          readAt: null,
          watchName: "Strong storms",
        }}
        onToggleRead={() => undefined}
        isUpdating={false}
      />,
    );

    expect(html).toContain("Strong");
    expect(html).toContain("Why you got this");
    expect(html).toContain("New signal");
  });

  it("places future events in the correct horizon", () => {
    const baseSignal = {
      id: 1, title: "Approach", summary: "Summary", matchReason: "Reason",
      severity: "notable" as const, source: "cneos" as const, sourceLabel: "NASA/JPL CNEOS",
      eventType: "close_approach", destinationUrl: "/close-approaches", sourceUrl: null,
      alertId: 1, triggerKey: "close-approach:1", sourceAt: null, snapshot: {},
      createdAt: "2026-07-12T12:00:00.000Z", updatedAt: "2026-07-12T12:00:00.000Z",
      readAt: null, watchName: "Close pass",
    };
    const now = Date.parse("2026-07-12T12:00:00.000Z");

    expect(horizonBucket({ ...baseSignal, eventAt: "2026-07-13T06:00:00.000Z" }, now)).toBe("Next 24 hours");
    expect(horizonBucket({ ...baseSignal, eventAt: "2026-07-15T12:00:00.000Z" }, now)).toBe("Next 7 days");
    expect(horizonBucket({ ...baseSignal, eventAt: "2026-07-21T12:00:00.000Z" }, now)).toBeNull();
    expect(horizonBucket({ ...baseSignal, eventAt: "2026-07-10T12:00:00.000Z" }, now)).toBeNull();
  });

  it("keeps Watch pagination metadata and rejects unexpected response fields", () => {
    const response = WatchesResponseSchema.parse({
      alerts: [],
      usage: { current: 21, limit: 50, remaining: 29 },
      total: 21,
      hasMore: true,
      nextCursor: "page-two",
    });

    expect(response.nextCursor).toBe("page-two");
    expect(response.hasMore).toBe(true);
    expect(response.total).toBe(21);
    expect(() => WatchesResponseSchema.parse({ ...response, surprise: true })).toThrow();
  });

  it("labels the CNEOS source precisely and validates complete Signal payloads", () => {
    const response = SignalsResponseSchema.parse({
      signals: [{
        id: 1, alertId: 2, watchName: "Close pass", triggerKey: "close-approach:1",
        source: "cneos", eventType: "close_approach", severity: null,
        title: "Approach", summary: "Summary", matchReason: "Reason",
        eventAt: null, sourceAt: null, destinationUrl: "/close-approaches",
        sourceUrl: null, snapshot: {}, readAt: null,
        createdAt: "2026-07-12T12:00:00.000Z", updatedAt: "2026-07-12T12:00:00.000Z",
      }],
      hasMore: false,
      nextCursor: null,
    });

    expect(response.signals[0]?.sourceLabel).toBe("NASA/JPL CNEOS");
    expect(() => SignalsResponseSchema.parse({ ...response, surprise: true })).toThrow();
  });
});
