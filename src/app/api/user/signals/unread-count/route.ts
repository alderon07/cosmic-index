import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { countUnreadSignals } from "@/lib/observatory-store";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ unreadCount: await countUnreadSignals(user.userId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const response = authErrorResponse(error); response.headers.set("Cache-Control", "private, no-store"); return response;
  }
}
