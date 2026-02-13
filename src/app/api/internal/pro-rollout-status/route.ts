import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isInternalAdmin, isInternalAdminConfigured } from "@/lib/admin-access";
import { resolveLimitMode } from "@/lib/feature-policy";
import { getUserDb } from "@/lib/user-db";
import {
  getActiveWaitlistCount,
  getInterestForDay,
  getInterestForLastDays,
  getUtcDayKey,
} from "@/lib/waitlist";

function getBaseHeaders() {
  return {
    "Cache-Control": "private, max-age=30",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export async function GET() {
  const headers = getBaseHeaders();

  if (!isInternalAdminConfigured()) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  }

  const user = await getAuthUser();
  if (!user || !isInternalAdmin(user.userId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  const db = getUserDb();
  if (!db) {
    return NextResponse.json({ error: "status_unavailable" }, { status: 503, headers });
  }

  try {
    const now = Date.now();
    const waitlistCount = await getActiveWaitlistCount(db);
    const mode = await resolveLimitMode({
      db,
      waitlistCountOverride: waitlistCount,
    });

    const todayKey = getUtcDayKey(now);
    const [interestToday, interest7d] = await Promise.all([
      getInterestForDay(db, todayKey),
      getInterestForLastDays(db, 7, now),
    ]);

    if (process.env.NODE_ENV === "production") {
      console.info(
        JSON.stringify({
          event: "pro_rollout_status_access",
          userId: user.userId,
          at: now,
        })
      );
    }

    return NextResponse.json(
      {
        waitlist: {
          activeCount: waitlistCount,
          threshold: mode.threshold,
          reached: mode.reached,
        },
        limits: {
          configuredMode: mode.configuredMode,
          effectiveMode: mode.effectiveMode,
          forceEnforce: mode.reason === "force_enforce",
        },
        interestToday,
        interest7d,
        generatedAt: now,
      },
      { headers }
    );
  } catch (error) {
    console.error("[internal] pro rollout status failed", error);
    return NextResponse.json({ error: "status_unavailable" }, { status: 503, headers });
  }
}
