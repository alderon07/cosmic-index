import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { WatchInputSchema } from "@/lib/observatory";
import { createWatch, decodeObservatoryCursor, listWatches } from "@/lib/observatory-store";
import { requireSameOrigin } from "@/lib/request-origin";
import { requireObservatoryMutationBudget } from "@/lib/observatory-mutation-limit";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
const ListQuerySchema = z.object({
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const query = ListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!query.success) {
      return NextResponse.json({ error: "Invalid query", code: "INVALID_QUERY", details: query.error.flatten() }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const rawCursor = query.data.cursor;
    const cursor = rawCursor ? decodeObservatoryCursor(rawCursor) ?? undefined : undefined;
    if (rawCursor && !cursor) {
      return NextResponse.json({ error: "Invalid cursor", code: "INVALID_CURSOR" }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const result = await listWatches({
      userId: user.userId,
      tier: user.tier,
      cursor,
      limit: query.data.limit,
    });
    const { watches, ...pagination } = result;
    return NextResponse.json({ alerts: watches, ...pagination }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;
    const user = await requireAuth();
    const rateLimitError = await requireObservatoryMutationBudget(user.userId);
    if (rateLimitError) return rateLimitError;
    const body = await request.json().catch(() => null);
    const parsed = WatchInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", code: "INVALID_REQUEST", details: parsed.error.flatten() }, { status: 400, headers: PRIVATE_HEADERS });
    }
    const result = await createWatch({ userId: user.userId, tier: user.tier, watch: parsed.data });
    if (result.status === "limit") {
      return NextResponse.json({ error: "Watch limit reached", code: "WATCH_LIMIT_REACHED", usage: result.usage }, { status: 409, headers: PRIVATE_HEADERS });
    }
    if (result.status === "duplicate") {
      return NextResponse.json({ error: "You already have this Watch", code: "DUPLICATE_WATCH" }, { status: 409, headers: PRIVATE_HEADERS });
    }
    return NextResponse.json(result.watch, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
