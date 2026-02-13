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
  const pathname = request.nextUrl.pathname;
  const isProduction = process.env.NODE_ENV === "production";
  const isProtectedPage =
    pathname.startsWith("/settings") || pathname.startsWith("/user/");
  const isProtectedDocRoute =
    isProduction &&
    (pathname.startsWith("/api/docs") ||
      pathname.startsWith("/api/internal/openapi") ||
      pathname.startsWith("/openapi.json"));

  if (isMockAuthEnabled()) {
    return NextResponse.next();
  }

  if (!isClerkServerConfigured()) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (isProtectedDocRoute) {
      return NextResponse.json(
        { error: "not_found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        }
      );
    }
    return NextResponse.next();
  }

  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const protectedPatterns = ["/settings(.*)", "/user/(.*)"];
  if (isProduction) {
    protectedPatterns.push(
      "/api/docs(.*)",
      "/api/internal/openapi(.*)",
      "/openapi.json"
    );
  }
  const isProtectedRoute = createRouteMatcher(protectedPatterns);

  return clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
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
