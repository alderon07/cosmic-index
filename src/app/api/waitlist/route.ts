import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { getWaitlistEnabled } from "@/lib/runtime-mode";
import { getUserDb } from "@/lib/user-db";
import { invalidateWaitlistCountCache } from "@/lib/feature-policy";
import {
  cleanupWaitlistArtifacts,
  incrementWaitlistSignupsDaily,
  normalizeEmail,
  parseWaitlistSource,
  upsertWaitlistSignup,
} from "@/lib/waitlist";
import { checkWaitlistRateLimit } from "@/lib/waitlist-rate-limit";

const WaitlistInputSchema = z.object({
  email: z.string().trim().email().max(320),
  source: z.string(),
});

export async function POST(request: NextRequest) {
  if (!getWaitlistEnabled()) {
    return NextResponse.json(
      { error: "feature_disabled", feature: "waitlist" },
      { status: 403 }
    );
  }

  const db = getUserDb();
  if (!db) {
    return NextResponse.json(
      { error: "waitlist_unavailable" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = WaitlistInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const source = parseWaitlistSource(parsed.data.source);
  if (!source) {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const rateLimit = await checkWaitlistRateLimit({
    request,
    emailNormalized: normalizedEmail,
  });

  if (rateLimit.unavailable) {
    return NextResponse.json(
      { error: "waitlist_unavailable" },
      { status: 503 }
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rateLimit.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": rateLimit.retryAfterSec.toString() },
      }
    );
  }

  try {
    let userId: string | null = null;
    try {
      const user = await getAuthUser();
      userId = user?.userId ?? null;
    } catch {
      userId = null;
    }

    const status = await upsertWaitlistSignup({
      db,
      emailRaw: parsed.data.email,
      source,
      userId,
    });

    if (status === "joined" || status === "reactivated") {
      await incrementWaitlistSignupsDaily(db);
    }

    await cleanupWaitlistArtifacts(db);
    invalidateWaitlistCountCache();

    return NextResponse.json(
      { ok: true, status },
      { status: status === "joined" ? 201 : 200 }
    );
  } catch (error) {
    console.error("[waitlist] failed to upsert signup", error);
    return NextResponse.json(
      { error: "waitlist_unavailable" },
      { status: 503 }
    );
  }
}
