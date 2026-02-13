import { NextResponse } from "next/server";
import { ApiReference } from "@scalar/nextjs-api-reference";
import { getAuthUser } from "@/lib/auth";
import { isInternalAdmin, isInternalAdminConfigured } from "@/lib/admin-access";
import { isClerkServerConfigured, isMockAuthEnabled } from "@/lib/runtime-mode";

const apiDocsHandler = ApiReference({
  url: "/api/internal/openapi",
  theme: "deepSpace",
  darkMode: true,
  metaData: {
    title: "Cosmic Index API Reference",
  },
});

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

async function assertInternalAdminAccess() {
  if (process.env.NODE_ENV !== "production") return null;

  if (!isClerkServerConfigured() || isMockAuthEnabled()) {
    console.error(
      "[internal-docs] blocked due to production auth misconfiguration (Clerk missing or mock auth enabled)."
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

  return null;
}

export async function GET(request: Request) {
  const blocked = await assertInternalAdminAccess();
  if (blocked) return blocked;

  const response = await apiDocsHandler();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", ROBOT_HEADER);
  return response;
}
