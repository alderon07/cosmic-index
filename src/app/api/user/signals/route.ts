import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { decodeObservatoryCursor, listSignals } from "@/lib/observatory-store";

const QuerySchema = z.object({
  status: z.enum(["all", "read", "unread"]).default("all"),
  alertId: z.coerce.number().int().positive().optional(),
  eventType: z.string().trim().min(1).max(40).optional(),
  cursor: z.string().min(1).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
}).strict();
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Invalid query", code: "INVALID_QUERY", details: parsed.error.flatten() }, { status: 400, headers: PRIVATE_HEADERS });
    const rawCursor = parsed.data.cursor;
    const cursor = rawCursor ? decodeObservatoryCursor(rawCursor) ?? undefined : undefined;
    if (rawCursor && !cursor) return NextResponse.json({ error: "Invalid cursor", code: "INVALID_CURSOR" }, { status: 400, headers: PRIVATE_HEADERS });
    const { limit, status, alertId, eventType } = parsed.data;
    const result = await listSignals({ userId: user.userId, cursor, limit, status, alertId, eventType });
    return NextResponse.json(result, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}
