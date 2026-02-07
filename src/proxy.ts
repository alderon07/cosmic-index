import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { isClerkServerConfigured, isMockAuthEnabled } from "@/lib/runtime-mode";

/**
 * Authentication middleware.
 *
 * - Mock mode: no redirects, allows local development without Clerk.
 * - Clerk mode: page protection is enforced by Clerk middleware.
 * - Fallback mode: when auth is disabled and Clerk is not configured,
 *   protected pages redirect home.
 */

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isMockAuthEnabled()) {
    return NextResponse.next();
  }

  if (!isClerkServerConfigured()) {
    if (
      request.nextUrl.pathname.startsWith("/settings") ||
      request.nextUrl.pathname.startsWith("/user/")
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isProtectedPage = createRouteMatcher(["/settings(.*)", "/user/(.*)"]);

  return clerkMiddleware(async (auth, req) => {
    if (isProtectedPage(req)) {
      await auth.protect();
    }
  })(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
