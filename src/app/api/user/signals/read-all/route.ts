import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { markAllSignalsRead } from "@/lib/observatory-store";
import { requireSameOrigin } from "@/lib/request-origin";

export async function POST(request: NextRequest) {
  try {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const user = await requireAuth();
    return NextResponse.json({ updated: await markAllSignalsRead(user.userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}
