import { resolveAdEligibility } from "@/lib/ad-eligibility";
import * as authUtilities from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";
import { createAdEligibilityHandler } from "./handler";

export const GET = createAdEligibilityHandler({
  getAuthenticatedUserId: authUtilities.getAuthenticatedUserId,
  getUserDb,
  resolveAdEligibility,
  getProPriceId: () => process.env.STRIPE_PRO_PRICE_ID,
  reportUnavailable: () => {
    console.error("[adsense] Eligibility lookup unavailable");
  },
});
