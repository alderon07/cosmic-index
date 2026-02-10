import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { invalidateWaitlistCountCache } from "@/lib/feature-policy";
import { getWaitlistEnabled } from "@/lib/runtime-mode";
import { getUserDb } from "@/lib/user-db";
import { cleanupWaitlistArtifacts, unsubscribeWaitlistByUserId } from "@/lib/waitlist";

export async function POST() {
  if (!getWaitlistEnabled()) {
    return NextResponse.json(
      { error: "feature_disabled", feature: "waitlist" },
      { status: 403 }
    );
  }

  try {
    const user = await requireAuth();
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
