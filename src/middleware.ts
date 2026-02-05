import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Clerk middleware for page-level authentication.
 *
 * IMPORTANT: This middleware protects PAGES only, not API routes.
 * - Pages: redirect to sign-in (good UX for browser navigation)
 * - APIs: use requireAuth() internally which returns 401 JSON (expected by API clients)
 *
 * This split ensures:
 * 1. Users get a smooth redirect experience when accessing protected pages
 * 2. API clients receive proper JSON error responses, not HTML redirects
 */

// Only page routes that require authentication (not APIs!)
const isProtectedPage = createRouteMatcher([
  "/settings(.*)",
  "/user/(.*)", // User dashboard pages (saved objects, collections, etc.)
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedPage(request)) {
    await auth.protect(); // Redirects to sign-in for pages
  }
  // API routes: NO middleware protection
  // They call requireAuth() which returns 401 JSON
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
