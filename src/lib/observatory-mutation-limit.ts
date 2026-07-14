import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function requireObservatoryMutationBudget(userId: string): Promise<NextResponse | null> {
  const result = await checkRateLimit(`observatory:${userId}`, "USER_MUTATION");
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "Too many Watch changes. Please wait a little and try again.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        ...getRateLimitHeaders(result, "USER_MUTATION"),
      },
    },
  );
}
