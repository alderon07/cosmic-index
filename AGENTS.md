# AGENTS.md

Last updated (UTC): 2026-04-11
Version: 1.6

This file provides implementation-oriented guidance for agents working in this repo.

## Change Log

- 2026-04-05: Added current deployment status notes: former `feature/pro-tier` work is already in production, Clerk is configured, Stripe live setup is still pending, and Google OAuth remains blocked until the app is published.
- 2026-03-03: Documented completed DB migration status (`001`-`004`) and updated Stripe billing behavior notes (always-available manage/cancel path plus portal customer fallback recovery).
- 2026-02-17: Space weather expanded to include `IPS`, `HSS`, `SEP`, a separate notifications endpoint (`GET /api/v1/space-weather/notifications`), and DONKI reliability hardening (retry/timeout/single-flight/cache updates).
- 2026-02-17: Cleaned wording and removed duplicate policy statements.
- 2026-02-13: Added explicit sections for project overview, build/test commands, code style, testing instructions, and security considerations.
- 2026-02-13: Added mandatory policy to keep the OpenAPI spec updated whenever endpoints under `src/app/api/**` change.
- 2026-02-13: Added top-level metadata header (`Last updated (UTC)`, `Version`).
- 2026-02-13: OpenAPI canonical file moved to `src/lib/openapi/openapi.json`; docs/spec are internal-admin-only in production.

## General
- When making a plan, explicitly check:
  - gotchas, caveats, and edge cases
  - performance improvements
  - missing implementation details
- Always do TDD

## Project Overview

Cosmic Index is a Next.js 16 App Router application for browsing and comparing:

- Exoplanets
- Stars
- Small bodies (asteroids/comets)
- Close approaches
- Fireballs
- Space weather
- APOD (home page feature)

It also includes Pro-tier features (saved objects, collections, saved searches, alerts, exports, billing).

Current deployment status:

- Former `feature/pro-tier` work is already merged and deployed to production.
- Clerk is configured in production and should be treated as the active auth path when keys are present.
- Stripe code paths exist, but live Stripe setup is still pending.
- Google OAuth should be treated as not production-ready until the app is published.

## Build and Test Commands

Use `mise` tasks when possible:

```bash
mise run dev
mise run build
mise run start
mise run lint
mise run sbdb-diag
mise run ingest-stars
mise run ingest-stars-reset
mise run ingest-exoplanets
mise run ingest-exoplanets-reset
mise run ingest-all
```

Equivalent Bun scripts are in `package.json` (`bun run <script>`).

Core build/test commands:

```bash
bun run lint
bun run build
bun test
bun test src/lib/__tests__/compare-facts.test.ts
bun test src/app/api/stripe/portal/route.test.ts
mise run cli-test
```

## Code Style Guidelines

- Use TypeScript strict-mode friendly code; avoid `any` unless unavoidable and documented.
- Prefer App Router server components by default; add `"use client"` only when interactivity requires it.
- Keep imports project-relative via `@/*` aliases when possible.
- Validate API input at the route boundary (Zod schemas in `src/lib/types.ts` and route-level parsing).
- Keep API response shapes consistent with shared response utilities and existing route patterns.
- Preserve canonical ID conventions (`exoplanet:*`, `star:*`, `small-body:*`, and hashed event IDs).
- Reuse existing libraries/utilities before adding new dependencies.
- Avoid using useEffect unless absolutely necessary.

## Testing Instructions

- Add or update tests for any behavioral change, especially in API routes and shared data utilities.
- For endpoint work, include happy-path and error-path coverage (validation, auth, and limits where applicable).
- Run targeted tests first, then broader checks:

```bash
bun test src/app/api/user/saved-objects/route.test.ts
bun test
bun run lint
```

- If runtime/network constraints prevent a full local build in agent environments, still run the highest-signal checks available and report any gaps.
- Endpoint changes are not complete until docs and tests are both updated.

## Commit Policy

- Always commit with a clear, descriptive message.
- Never commit/push any code without explicit approval.

## Security Considerations

- Never commit secrets or hardcode credentials; keep secrets in environment variables.
- Treat all request input as untrusted. Validate, constrain, and sanitize at API boundaries.
- Keep auth and authorization logic aligned with `src/lib/auth.ts` and `src/proxy.ts`.
- Preserve rate-limiting and abuse protections (`src/lib/rate-limit.ts`, `src/lib/api-middleware.ts`).
- Keep webhook and billing flows signature-verified and idempotent.
- Be explicit and minimal when trusting proxy headers (`TRUST_CLOUDFLARE_HEADERS`, `TRUST_FLY_HEADERS`).

## OpenAPI Spec Requirement

- If you add, remove, or change any endpoint under `src/app/api/**`, you MUST update `src/lib/openapi/openapi.json` in the same change.
- This includes path/method changes, query/path params, request/response schemas, status codes, auth requirements, and documented rate-limit behavior.
- `src/app/api/docs/route.ts` serves docs from `/api/internal/openapi`; keep the spec accurate and in sync at all times.
- In production, OpenAPI docs/spec are restricted to internal admins via `INTERNAL_ADMIN_IDS` (with `PRO_ROLLOUT_ADMIN_IDS` fallback).

## Architecture (Current)

### Routing and API Surface

- App Router pages live under `src/app`.
- Versioned API routes are under `src/app/api/v1/*`.
- Space weather API routes:
  - `GET /api/v1/space-weather` (event stream with `FLR/CME/GST/IPS/HSS/SEP`)
  - `GET /api/v1/space-weather/{id}` (detail by event ID)
  - `GET /api/v1/space-weather/notifications` (separate DONKI notifications feed)
- User/Stripe routes are under `src/app/api/user/*`, `src/app/api/stripe/*`, `src/app/api/webhooks/*`.
- `next.config.ts` rewrites unversioned `/api/*` endpoints to `/api/v1/*` for backward compatibility.

### Middleware / Proxy

- `src/proxy.ts` handles route protection behavior.
- Protected page prefixes: `/settings*`, `/user/*`.

### Data Sources and Indexes

- Exoplanets browse/search: `src/lib/exoplanet-index.ts` (Turso-backed index).
- Exoplanet detail: `src/lib/nasa-exoplanet.ts` (NASA TAP/API fetch path).
- Stars browse/detail: `src/lib/star-index.ts` (Turso-backed).
- Small bodies browse/detail: `src/lib/jpl-sbdb.ts` (JPL APIs, slug/designation resolution).
- Event feeds:
  - Close approaches: `src/lib/cneos-close-approach.ts`
  - Fireballs: `src/lib/cneos-fireball.ts`
  - Space weather events + notifications: `src/lib/nasa-donki.ts`

### Storage Roles

- Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`):
  - Star/exoplanet index tables
  - User/Pro feature tables
  - Core Pro migrations `001_pro_features.sql`, `002_export_history_audit.sql`, `003_tier_limit_indexes.sql`, and `004_waitlist_interest.sql` are now applied
- Upstash Redis (`UPSTASH_REDIS_*`):
  - Cache (`src/lib/cache.ts`)
  - Rate limiting (`src/lib/rate-limit.ts`)

## Runtime Modes and Auth

Primary files:

- `src/lib/runtime-mode.ts`
- `src/lib/auth.ts`
- `src/components/auth/app-auth-provider.tsx`

Supported auth modes:

- `clerk`: when Clerk keys are configured
- `none`: unauthenticated fallback

Important behavior:

- Server authorization decisions use DB-backed tier state, not JWT tier claims.

## Compare System (Current)

Primary files:

- `src/components/compare/compare-provider.tsx`
- `src/lib/compare-facts.ts`
- `src/lib/compare-storage.ts`
- `src/components/compare/compare-tray.tsx`
- `src/components/compare/compare-table.tsx`

Current semantics:

- Multi-domain compare supports `exoplanets`, `stars`, `small-bodies`.
- One active domain per tray (cross-domain add is blocked with recovery CTA).
- Max compare items: 3.
- Compare IDs are namespaced (`domain:id`).
- State is in session storage (`cosmic-index:compare:v1`) with validation/repair/reset behavior.
- Capabilities can be restricted with `COMPARE_DOMAINS`.
  - Malformed value fails closed to `["exoplanets"]`.

## Saved Objects and Canonical IDs

Primary files:

- `src/lib/canonical-id.ts`
- `src/app/user/saved-objects/saved-objects-page-content.tsx`

Notes:

- Saved/catalog IDs use canonical prefixes: `exoplanet:...`, `star:...`, `small-body:...`.
- Event-like saves use hashed canonical IDs (`fireball`, `close-approach`, `flr`, `cme`, `gst`).
- Space weather save IDs currently remain limited to `flr/cme/gst`; `ips/hss/sep` save support is not yet wired.
- Exoplanet detail IDs are URI-encoded names; saved-object link code includes compatibility for legacy slug-style IDs.

## Caching and Rate Limiting

### Cache

- `src/lib/cache.ts` wraps Upstash with graceful fallback.
- During build phase (`NEXT_PHASE=phase-production-build` or lifecycle `build`), Redis cache calls are disabled to avoid static prerender dynamic-fetch errors.
- Space weather cache keys include per-type buckets (`sw:flr`, `sw:cme`, `sw:gst`, `sw:ips`, `sw:hss`, `sw:sep`) plus notifications (`sw:notifications`).

### Rate Limiting

- `src/lib/rate-limit.ts`:
  - Redis Lua sliding window + burst limits
  - In-memory fallback when Redis unavailable
  - Confidence-scaled client identity (`ip`, `fingerprint`, `unknown`)
- `src/lib/api-middleware.ts` enforces per-type and global caps.

## Common Gotchas

- `src/proxy.ts` is used instead of a legacy `middleware.ts` naming pattern.
- Exoplanet browse requires Turso index; detail pages may still work via NASA fetch path.
- Billing status can lag immediately after Stripe Checkout until webhook sync completes; billing UI exposes Manage/Cancel during this window.
- Stripe portal route includes customer recovery fallback via `stripe_subscription_id` and email lookup when `stripe_customer_id` linkage is missing.
- If compare state seems stale/weird, clear session storage key `cosmic-index:compare:v1`.
- DONKI notifications endpoint has a 30-day max query window; requests beyond this are clamped and surfaced via warnings.
- Linked space-weather events can include unsupported DONKI types (e.g. `RBE`/`MPC`); unsupported links should route to DONKI external references, not in-app detail routes.

## High-Value Files

- `src/app/layout.tsx` (global providers, compare tray, shell/footer)
- `src/lib/theme.ts` (object/domain theme classes)
- `src/lib/types.ts` (core shared types + slug helpers)
- `src/lib/api-middleware.ts` (validation + rate-limit integration)
- `src/components/object-card.tsx` and `src/components/object-detail.tsx` (core browse/detail UX)
