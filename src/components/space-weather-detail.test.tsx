import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SpaceWeatherDetail } from "./space-weather-detail";
import type { IPSEvent } from "@/lib/types";

const event: IPSEvent = {
  id: "2026-09-17T01:24:00-IPS-001",
  eventType: "IPS",
  startTime: "2026-09-17T01:24:00Z",
  location: "Earth",
};

describe("SpaceWeatherDetail", () => {
  it("keeps dates and UTC measurements identical across server and browser time zones", () => {
    const originalTimeZone = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      const serverHtml = renderToStaticMarkup(<SpaceWeatherDetail event={event} />);
      process.env.TZ = "America/New_York";
      const browserHtml = renderToStaticMarkup(<SpaceWeatherDetail event={event} />);

      for (const html of [serverHtml, browserHtml]) {
        expect(html).toContain("Thursday, September 17, 2026");
        expect(html).toContain("01:24:00 UTC");
        expect(html).not.toContain("Wednesday, September 16, 2026");
        expect(html).not.toContain("EDT");
      }
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });
});
