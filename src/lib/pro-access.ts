import type { AuthUser, UserTier } from "@/lib/auth";
import { isInternalAdmin } from "@/lib/admin-access";
import { getProGate, type ProGate } from "@/lib/runtime-mode";

type ProUser = Pick<AuthUser, "userId" | "tier"> | null | undefined;

export interface ProAccess {
  gate: ProGate;
  userId: string | null;
  tier: UserTier | null;
  isInternalAdmin: boolean;
  isCurrentPro: boolean;
  canAccessProduct: boolean;
  canAccessCollections: boolean;
  canAccessProSurfaces: boolean;
  canStartCheckout: boolean;
  canManageBilling: boolean;
  canAccessWaitlist: boolean;
  shouldShowWaitlist: boolean;
  upgradePreviewAvailable: boolean;
}

export function resolveProAccess(user: ProUser): ProAccess {
  const gate = getProGate();
  const userId = user?.userId ?? null;
  const tier = user?.tier ?? null;
  const isAdmin = isInternalAdmin(userId);
  const isCurrentPro = tier === "pro";
  const canAccessProduct = gate.productEnabled || isAdmin || isCurrentPro;
  const canAccessCollections = canAccessProduct;
  const canAccessProSurfaces = gate.surfacesEnabled && canAccessProduct;
  const canStartCheckout = gate.billingEnabled && !isCurrentPro && (gate.productEnabled || isAdmin);
  const canManageBilling = gate.billingEnabled && (gate.productEnabled || isAdmin || isCurrentPro);
  const canAccessWaitlist = false;
  const shouldShowWaitlist = false;

  return {
    gate,
    userId,
    tier,
    isInternalAdmin: isAdmin,
    isCurrentPro,
    canAccessProduct,
    canAccessCollections,
    canAccessProSurfaces,
    canStartCheckout,
    canManageBilling,
    canAccessWaitlist,
    shouldShowWaitlist,
    upgradePreviewAvailable: false,
  };
}

export function getFeatureDisabledResponse(
  feature: "billing" | "pro_surfaces" | "waitlist" | "collections"
): Response {
  return Response.json(
    { error: "feature_disabled", feature },
    { status: 403 }
  );
}

export function getFeatureRetiredResponse(
  feature: "waitlist"
): Response {
  return Response.json(
    { error: "feature_retired", feature },
    { status: 410 }
  );
}
