import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { GET } from "@/app/ads.txt/route";

const originalClientId = process.env.GOOGLE_ADSENSE_CLIENT_ID;

beforeEach(() => {
  process.env.GOOGLE_ADSENSE_CLIENT_ID = "ca-pub-1234567890123456";
});

afterAll(() => {
  if (originalClientId === undefined) delete process.env.GOOGLE_ADSENSE_CLIENT_ID;
  else process.env.GOOGLE_ADSENSE_CLIENT_ID = originalClientId;
});

describe("GET /ads.txt", () => {
  it("serves the publisher record as bounded-cache plain text", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toContain("max-age=");
    expect(await response.text()).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n"
    );
  });

  it("returns 404 for absent or invalid publisher configuration", () => {
    process.env.GOOGLE_ADSENSE_CLIENT_ID = "invalid";
    expect(GET().status).toBe(404);

    delete process.env.GOOGLE_ADSENSE_CLIENT_ID;
    expect(GET().status).toBe(404);
  });
});
