import { resolveAdEligibility } from "@/lib/ad-eligibility";
import * as authUtilities from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
} as const;

function unavailableResponse(): Response {
  return Response.json(
    {
      error: "Ad eligibility is temporarily unavailable",
      code: "AD_ELIGIBILITY_UNAVAILABLE",
    },
    { status: 503, headers: PRIVATE_NO_STORE_HEADERS }
  );
}

interface AdEligibilityRouteDependencies {
  getAuthenticatedUserId: typeof authUtilities.getAuthenticatedUserId;
  getUserDb: typeof getUserDb;
  resolveAdEligibility: typeof resolveAdEligibility;
  getProPriceId: () => string | undefined;
  reportUnavailable: () => void;
}

export function createAdEligibilityHandler(
  dependencies: AdEligibilityRouteDependencies
): () => Promise<Response> {
  return async function getAdEligibility(): Promise<Response> {
    try {
      const userId = await dependencies.getAuthenticatedUserId();
      if (!userId) {
        return Response.json(
          { error: "Authentication required", code: "UNAUTHORIZED" },
          { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }

      const database = dependencies.getUserDb();
      const proPriceId = dependencies.getProPriceId()?.trim();
      if (!database || !proPriceId) {
        return unavailableResponse();
      }

      const canShowAds = await dependencies.resolveAdEligibility(database, {
        userId,
        proPriceId,
      });

      return Response.json(
        { canShowAds },
        { headers: PRIVATE_NO_STORE_HEADERS }
      );
    } catch {
      dependencies.reportUnavailable();
      return unavailableResponse();
    }
  };
}

export const GET = createAdEligibilityHandler({
  getAuthenticatedUserId: authUtilities.getAuthenticatedUserId,
  getUserDb,
  resolveAdEligibility,
  getProPriceId: () => process.env.STRIPE_PRO_PRICE_ID,
  reportUnavailable: () => {
    console.error("[adsense] Eligibility lookup unavailable");
  },
});
