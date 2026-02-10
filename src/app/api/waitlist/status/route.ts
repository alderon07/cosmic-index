import { NextResponse } from "next/server";
import { getUserDb } from "@/lib/user-db";
import { resolveLimitMode } from "@/lib/feature-policy";
import { getActiveWaitlistCount } from "@/lib/waitlist";

export async function GET() {
  const db = getUserDb();
  if (!db) {
    return NextResponse.json({ error: "status_unavailable" }, { status: 503 });
  }

  try {
    const waitlistCount = await getActiveWaitlistCount(db);
    const mode = await resolveLimitMode({
      db,
      waitlistCountOverride: waitlistCount,
    });

    return NextResponse.json({
      waitlistCount,
      threshold: mode.threshold,
      reached: mode.reached,
      configuredMode: mode.configuredMode,
      effectiveMode: mode.effectiveMode,
    });
  } catch (error) {
    console.error("[waitlist] failed to load status", error);
    return NextResponse.json({ error: "status_unavailable" }, { status: 503 });
  }
}
