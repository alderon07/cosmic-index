import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/auth";
import { getFeatureDisabledResponse, resolveProAccess } from "@/lib/pro-access";
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
  email: z.string().trim().email().max(320).optional(),
  source: z.string(),
});

export async function POST(request: NextRequest) {
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

    const accountEmailResult = z.string().trim().email().max(320).safeParse(user.email ?? "");
    if (!accountEmailResult.success) {
      return NextResponse.json({ error: "account_email_unavailable" }, { status: 400 });
    }

    const accountEmail = accountEmailResult.data;
    const normalizedEmail = normalizeEmail(accountEmail);
    if (parsed.data.email) {
      const requestedEmail = normalizeEmail(parsed.data.email);
      if (requestedEmail !== normalizedEmail) {
        return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
      }
    }

    const rateLimit = await checkWaitlistRateLimit({
      request,
      emailNormalized: normalizedEmail,
      userId: user.userId,
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

    const status = await upsertWaitlistSignup({
      db,
      emailRaw: accountEmail,
      source,
      userId: user.userId,
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
    if (error instanceof Error && error.name === "AuthError") {
      return authErrorResponse(error);
    }

    console.error("[waitlist] failed to upsert signup", error);
    return NextResponse.json(
      { error: "waitlist_unavailable" },
      { status: 503 }
    );
  }
}
