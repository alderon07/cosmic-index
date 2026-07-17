import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import type { StarData, StellarHostParameters } from "@/lib/types";

let indexedStar: StarData | null;
let stellarParameters: StellarHostParameters | null;
let stellarParametersError: Error | null;

const star: StarData = {
  id: "11%20UMi",
  type: "STAR",
  displayName: "11 UMi",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "11 UMi",
  summary: "11 UMi is a host star.",
  keyFacts: [],
  links: [],
  hostname: "11 UMi",
  planetCount: 1,
};

mock.module("@/lib/star-index", () => ({
  getStarBySlug: async () => indexedStar,
}));

mock.module("@/lib/nasa-stellar-host", () => ({
  fetchStellarHostParameters: async () => {
    if (stellarParametersError) throw stellarParametersError;
    return stellarParameters;
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_star_detail" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) => Response.json({ data }),
  apiError: (_code: string, message: string, status: number) =>
    Response.json({ error: message }, { status }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/stars/[id]/route");

beforeEach(() => {
  indexedStar = star;
  stellarParametersError = null;
  stellarParameters = {
    identifiers: { hip: "HIP 74793" },
    coordinates: {},
    photometry: [],
    abundances: [],
    solutions: [{ reference: "Gaia DR2", effectiveTemperatureK: { value: 4248.7 } }],
  };
});

describe("GET /api/v1/stars/[id]", () => {
  it("returns the detail-only stellar solution set and aliases", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/stars/11%20UMi"),
      { params: Promise.resolve({ id: "11%20UMi" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.aliases).toEqual(["HIP 74793"]);
    expect(body.data.stellarParameters.solutions[0].reference).toBe("Gaia DR2");
  });

  it("keeps the indexed detail available when enrichment is unavailable", async () => {
    stellarParameters = null;

    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/stars/11%20UMi"),
      { params: Promise.resolve({ id: "11%20UMi" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.stellarParameters).toBeUndefined();
  });

  it("degrades to the indexed detail when the upstream request fails", async () => {
    stellarParametersError = new Error("upstream timeout");

    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/stars/11%20UMi"),
      { params: Promise.resolve({ id: "11%20UMi" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.hostname).toBe("11 UMi");
    expect(body.data.stellarParameters).toBeUndefined();
  });
});
