import { NextRequest, NextResponse } from "next/server";
import { getRandomObjectPath } from "@/lib/random-object";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): NextResponse {
  const destination = new URL(getRandomObjectPath(), request.url);
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
