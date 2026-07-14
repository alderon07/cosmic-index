import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { setSignalReadState } from "@/lib/observatory-store";
import { requireSameOrigin } from "@/lib/request-origin";

interface RouteParams { params: Promise<{ id: string }> }
const BodySchema = z.object({ read: z.boolean() }).strict();
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const user = await requireAuth();
    const rawId = (await params).id;
    const id = /^\d+$/.test(rawId) ? Number(rawId) : 0;
    if (id <= 0) return NextResponse.json({ error: "Invalid ID", code: "INVALID_ID" }, { status: 400, headers: PRIVATE_HEADERS });
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", code: "INVALID_REQUEST", details: parsed.error.flatten() }, { status: 400, headers: PRIVATE_HEADERS });
    return await setSignalReadState(user.userId, id, parsed.data.read)
      ? NextResponse.json({ success: true, read: parsed.data.read }, { headers: PRIVATE_HEADERS })
      : NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_HEADERS });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}
