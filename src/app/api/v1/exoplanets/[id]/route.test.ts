import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import type { ExoplanetData } from "@/lib/types";

let indexedPlanet: ExoplanetData | null;
let upstreamPlanet: ExoplanetData | null;

const dmpp2d: ExoplanetData = {
  id: "DMPP-2%20d",
  type: "EXOPLANET",
  displayName: "DMPP-2 d",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "DMPP-2 d",
  summary: "DMPP-2 d is an exoplanet orbiting DMPP-2.",
  keyFacts: [],
  links: [],
  hostStar: "DMPP-2",
  discoveryMethod: "Radial Velocity",
  orbitalPeriodDays: 16.491,
  massEarth: 91.79,
  planetaryParameters: {
    reference: "Standing et al. 2026",
    orbitalPeriodDays: { value: 16.491, errorPlus: 0.067, errorMinus: 0.053 },
    semiMajorAxisAu: { value: 0.1432, errorPlus: 0.0012, errorMinus: 0.0013 },
    massEarth: { value: 91.79, errorPlus: 6.11, errorMinus: 7.32 },
    massProvenance: "Msini",
    eccentricity: { value: 0.1, limit: "upper" },
  },
};

mock.module("@/lib/exoplanet-index", () => ({
  getExoplanetBySlug: async () => indexedPlanet,
}));

mock.module("@/lib/nasa-exoplanet", () => ({
  fetchExoplanetBySlug: async () => upstreamPlanet,
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_exoplanet_detail" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) => Response.json({ data }),
  apiError: (_code: string, message: string, status: number) =>
    Response.json({ error: message }, { status }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/exoplanets/[id]/route");

beforeEach(() => {
  indexedPlanet = dmpp2d;
  upstreamPlanet = null;
});

describe("GET /api/v1/exoplanets/[id]", () => {
  it("returns the structured planetary parameter set", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/exoplanets/DMPP-2%20d"),
      { params: Promise.resolve({ id: "DMPP-2%20d" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.massEarth).toBe(91.79);
    expect(body.data.planetaryParameters.massProvenance).toBe("Msini");
    expect(body.data.planetaryParameters.eccentricity).toEqual({
      value: 0.1,
      limit: "upper",
    });
  });

  it("returns 404 when neither the index nor NASA has the planet", async () => {
    indexedPlanet = null;
    upstreamPlanet = null;

    const response = await GET(
      new NextRequest("http://localhost:3000/api/v1/exoplanets/missing"),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
