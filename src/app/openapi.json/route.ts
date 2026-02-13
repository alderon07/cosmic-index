import { NextResponse } from "next/server";

const ROBOT_HEADER = "noindex, nofollow";
export const runtime = "nodejs";

function blockedResponse() {
  return NextResponse.json(
    { error: "not_found" },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": ROBOT_HEADER,
      },
    }
  );
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return blockedResponse();
  }

  const target = new URL("/api/internal/openapi", request.url);
  return NextResponse.redirect(target);
}
