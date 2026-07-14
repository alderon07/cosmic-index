import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { WatchUpdateSchema } from "@/lib/observatory";
import { deleteWatch, getWatch, updateWatch } from "@/lib/observatory-store";
import { requireSameOrigin } from "@/lib/request-origin";
import { requireObservatoryMutationBudget } from "@/lib/observatory-mutation-limit";

interface RouteParams { params: Promise<{ id: string }> }
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function parseId(raw: string): number | null {
  return /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const rateLimitError = await requireObservatoryMutationBudget(user.userId);
    if (rateLimitError) return rateLimitError;
    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid ID", code: "INVALID_ID" }, { status: 400, headers: PRIVATE_HEADERS });
    const watch = await getWatch(user.userId, id);
    return watch
      ? NextResponse.json(watch, { headers: PRIVATE_HEADERS })
      : NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const user = await requireAuth();
    const rateLimitError = await requireObservatoryMutationBudget(user.userId);
    if (rateLimitError) return rateLimitError;
    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid ID", code: "INVALID_ID" }, { status: 400, headers: PRIVATE_HEADERS });
    const parsed = WatchUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", code: "INVALID_REQUEST", details: parsed.error.flatten() }, { status: 400, headers: PRIVATE_HEADERS });
    const result = await updateWatch({ userId: user.userId, tier: user.tier, id, update: parsed.data });
    if (result.status === "updated") return NextResponse.json(result.watch, { headers: PRIVATE_HEADERS });
    if (result.status === "not_found") return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_HEADERS });
    if (result.status === "duplicate") return NextResponse.json({ error: "You already have this Watch", code: "DUPLICATE_WATCH" }, { status: 409, headers: PRIVATE_HEADERS });
    if (result.status === "type_mismatch") return NextResponse.json({ error: "Config does not match Watch type", code: "WATCH_TYPE_MISMATCH" }, { status: 400, headers: PRIVATE_HEADERS });
    if (result.status === "limit") return NextResponse.json({ error: "Delete extra Watches before enabling another", code: "WATCH_LIMIT_REACHED" }, { status: 409, headers: PRIVATE_HEADERS });
    return NextResponse.json({ error: "Watch changed; refresh and try again", code: "EDIT_CONFLICT" }, { status: 409, headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const user = await requireAuth();
    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid ID", code: "INVALID_ID" }, { status: 400, headers: PRIVATE_HEADERS });
    return await deleteWatch(user.userId, id)
      ? NextResponse.json({ success: true }, { headers: PRIVATE_HEADERS })
      : NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}
