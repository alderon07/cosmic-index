import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { __resetCacheStateForTests } from "@/lib/cache";
import { __resetDonkiTransientStateForTests, __setDonkiFetchForTests } from "@/lib/nasa-donki";
import type {
  SpaceWeatherNotificationType,
} from "@/lib/types";

let seenDonkiEndpoints: string[] = [];
let notificationType: SpaceWeatherNotificationType | "other" = "CME";
let notificationBody = "Activity ID: 2026-04-12T09:00:00-CME-001\nCME watch remains elevated.";
let eventPayloads: Record<string, unknown[]> = {};
const originalFetch = globalThis.fetch;

const { fetchUnifiedSpaceWeatherAlerts } = await import("@/lib/space-weather/alerts");

beforeEach(() => {
  seenDonkiEndpoints = [];
  notificationType = "CME";
  notificationBody = "Activity ID: 2026-04-12T09:00:00-CME-001\nCME watch remains elevated.";
  eventPayloads = {
    CME: [
      {
        activityID: "2026-04-12T09:00:00-CME-001",
        startTime: "2026-04-12T09:00:00Z",
        cmeAnalyses: [{ speed: 1550, isMostAccurate: true }],
      },
    ],
    FLR: [],
  };
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  __setDonkiFetchForTests(async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const endpoint = url.pathname.split("/").pop() ?? "";
    seenDonkiEndpoints.push(endpoint);

    if (endpoint === "notifications") {
      return new Response(
        JSON.stringify([
          {
            messageID: "20260412-AL-001",
            messageType: notificationType,
            messageIssueTime: "2026-04-12T12:00:00Z",
            messageURL: "https://example.com/donki/alert/1",
            messageBody: notificationBody,
          },
          {
            messageID: "20260412-AL-002",
            messageType: "MPC",
            messageIssueTime: "2026-04-12T08:30:00Z",
            messageBody: "General operational notice.",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(eventPayloads[endpoint] ?? []), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        {
          product_id: "K05W",
          issue_datetime: "2026-04-10 14:26:04.470",
          message:
            "Space Weather Message Code: WARK05\r\nSerial Number: 2223\r\nIssue Time: 2026 Apr 10 1426 UTC\r\n\r\nWARNING: Geomagnetic K-index of 5 expected\r\nValid From: 2026 Apr 10 1425 UTC\r\nValid To: 2026 Apr 11 0900 UTC\r\nWarning Condition: Onset\r\nNOAA Scale: G1 - Minor\r\n\r\nPotential Impacts: Area of impact primarily poleward of 60 degrees Geomagnetic Latitude.",
        },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  __setDonkiFetchForTests(null);
  __resetDonkiTransientStateForTests();
  __resetCacheStateForTests();
});

afterAll(() => {
  mock.restore();
});

describe("fetchUnifiedSpaceWeatherAlerts", () => {
  it("normalizes notifications into alert cards with related event context", async () => {
    const result = await fetchUnifiedSpaceWeatherAlerts({ type: "all", limit: 8, page: 1 });

    expect(result.alerts).toHaveLength(3);
    const donkiAlert = result.alerts.find((alert) => alert.id === "20260412-AL-001");
    const secondaryDonkiAlert = result.alerts.find((alert) => alert.id === "20260412-AL-002");

    expect(donkiAlert).toMatchObject({
      id: "20260412-AL-001",
      source: "donki",
      category: "cme",
      severity: "severe",
      activityCount: 1,
      relatedEventIds: ["2026-04-12T09:00:00-CME-001"],
    });
    expect(donkiAlert?.relatedEvents[0]).toMatchObject({
      id: "2026-04-12T09:00:00-CME-001",
      typeLabel: "Coronal Mass Ejection",
    });
    expect(secondaryDonkiAlert).toMatchObject({
      id: "20260412-AL-002",
      category: "other",
      severity: "minor",
      activityCount: 0,
    });
    expect(seenDonkiEndpoints).toContain("notifications");
    expect(seenDonkiEndpoints).toContain("CME");
  });

  it("preserves upstream warnings and unresolved activity notices", async () => {
    notificationType = "FLR";
    notificationBody = "Activity ID: 2026-04-12T05:30:00-FLR-999";
    eventPayloads = {
      CME: [],
      FLR: [],
    };

    const result = await fetchUnifiedSpaceWeatherAlerts({ type: "all", limit: 8, page: 1 });

    expect(result.alerts[0].relatedEvents).toHaveLength(0);
    expect(result.meta.warnings?.some((warning) => warning.includes("could not be resolved"))).toBe(true);
    expect(result.meta.warnings?.some((warning) => warning.includes("returned as 'other'"))).toBe(true);
    expect(seenDonkiEndpoints).toContain("FLR");
  });

  it("includes SWPC source-grouped alerts alongside DONKI alerts", async () => {
    const result = await fetchUnifiedSpaceWeatherAlerts({ type: "all", limit: 8, page: 1 });

    expect(result.meta.sourcesIncluded).toEqual(["donki", "swpc"]);
    expect(result.alerts.some((alert) => alert.source === "swpc")).toBe(true);
    expect(result.alerts.find((alert) => alert.source === "swpc")).toMatchObject({
      category: "gst",
      severity: "minor",
    });
  });
});
