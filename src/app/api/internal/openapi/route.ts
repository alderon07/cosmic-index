import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { isInternalAdmin, isInternalAdminConfigured } from "@/lib/admin-access";
import { isClerkServerConfigured } from "@/lib/runtime-mode";
import openApiSpec from "@/lib/openapi/openapi.json";

export const runtime = "nodejs";

const ROBOT_HEADER = "noindex, nofollow";
const SPEC_PAYLOAD = JSON.stringify(openApiSpec);

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

function specResponse() {
  return new NextResponse(SPEC_PAYLOAD, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": ROBOT_HEADER,
    },
  });
}

export async function GET() {
  if (process.env.NODE_ENV !== "production") {
    return specResponse();
  }

  if (!isClerkServerConfigured()) {
    console.error(
      "[internal-openapi] blocked due to production auth misconfiguration (Clerk missing)."
    );
    return blockedResponse();
  }

  if (!isInternalAdminConfigured()) {
    return blockedResponse();
  }

  const user = await getAuthUser();
  if (!user || !isInternalAdmin(user.userId)) {
    return blockedResponse();
  }

  return specResponse();
}
