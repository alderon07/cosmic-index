import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Client } from "@libsql/client";
import { createAdEligibilityHandler } from "@/app/api/user/ad-eligibility/route";

let authenticatedUserId: string | null = "user_free";
let authenticationError: Error | null = null;
let databaseAvailable = true;
let eligibilityResult = true;
let eligibilityError: Error | null = null;
const resolveCalls: Array<{ userId: string; proPriceId: string | undefined }> = [];
const originalPriceId = process.env.STRIPE_PRO_PRICE_ID;

const mockDatabase = {} as Client;

const GET = createAdEligibilityHandler({
  getAuthenticatedUserId: async () => {
    if (authenticationError) throw authenticationError;
    return authenticatedUserId;
  },
  getUserDb: () => (databaseAvailable ? mockDatabase : null),
  resolveAdEligibility: async (
    _database: unknown,
    options: { userId: string; proPriceId: string | undefined }
  ) => {
    resolveCalls.push(options);
    if (eligibilityError) throw eligibilityError;
    return eligibilityResult;
  },
  getProPriceId: () => process.env.STRIPE_PRO_PRICE_ID,
  reportUnavailable: () => undefined,
});

beforeEach(() => {
  authenticatedUserId = "user_free";
  authenticationError = null;
  databaseAvailable = true;
  eligibilityResult = true;
  eligibilityError = null;
  resolveCalls.length = 0;
  process.env.STRIPE_PRO_PRICE_ID = "price_pro";
});

afterAll(() => {
  if (originalPriceId === undefined) delete process.env.STRIPE_PRO_PRICE_ID;
  else process.env.STRIPE_PRO_PRICE_ID = originalPriceId;
});

describe("GET /api/user/ad-eligibility", () => {
  it("returns only canShowAds for an eligible signed-in user", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ canShowAds: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(resolveCalls).toEqual([
      { userId: "user_free", proPriceId: "price_pro" },
    ]);
  });

  it("returns a normal no-ad result for a Pro user", async () => {
    eligibilityResult = false;

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ canShowAds: false });
  });

  it("returns 401 without querying the database when unauthenticated", async () => {
    authenticatedUserId = null;

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(resolveCalls).toHaveLength(0);
  });

  it.each([
    "missing database",
    "missing price",
    "blank price",
    "database failure",
    "authentication failure",
  ])(
    "fails closed for %s",
    async (condition) => {
      if (condition === "missing database") databaseAvailable = false;
      if (condition === "missing price") delete process.env.STRIPE_PRO_PRICE_ID;
      if (condition === "blank price") process.env.STRIPE_PRO_PRICE_ID = "   ";
      if (condition === "database failure") eligibilityError = new Error("offline");
      if (condition === "authentication failure") {
        authenticationError = new Error("Clerk unavailable");
      }

      const response = await GET();

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: "Ad eligibility is temporarily unavailable",
        code: "AD_ELIGIBILITY_UNAVAILABLE",
      });
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  );
});
