import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { invalidateWaitlistCountCache } from "@/lib/feature-policy";
import { getFeatureDisabledResponse, resolveProAccess } from "@/lib/pro-access";
import { getUserDb } from "@/lib/user-db";
import { cleanupWaitlistArtifacts, unsubscribeWaitlistByUserId } from "@/lib/waitlist";

export async function POST() {
  try {
    const user = await requireAuth();
    if (!resolveProAccess(user).canAccessWaitlist) {
      return getFeatureDisabledResponse("waitlist");
    }
    const db = getUserDb();
    if (!db) {
      return NextResponse.json(
        { error: "waitlist_unavailable" },
        { status: 503 }
      );
    }

    await unsubscribeWaitlistByUserId(db, user.userId);
    await cleanupWaitlistArtifacts(db);
    invalidateWaitlistCountCache();

    return NextResponse.json({ ok: true, status: "unsubscribed" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return authErrorResponse(error);
    }

    console.error("[waitlist] unsubscribe failed", error);
    return NextResponse.json(
      { error: "waitlist_unavailable" },
      { status: 503 }
    );
  }
}
