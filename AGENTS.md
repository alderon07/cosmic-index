# AGENTS.md

Last updated: 2026-07-17

Operational guidance for agents working in this repository.

## General

- This project needs to adhere to hobby account limits for the stack. This means that we need to be careful about the size of the database, the number of requests, and the number of users.
- Always code with accessibility, performance, maintainability, operability, and security in mind.
- Do not use any: Writing any turns off type safety. It defeats the main goal of using TypeScript. Use unknown or define precise shapes instead.
- Avoid React.FC: Typing components with React.FC adds an implicit children prop and legacy behaviors. Use standard function declarations and type your props explicitly.Do not ignore event types: Generic event parameters default to broad types if left unannotated. Always use specific types like React.ChangeEvent<HTMLInputElement> or React.FormEvent.Do not rely solely on inference for complex state: Simple hooks like useState(false) are easy for TypeScript to guess. Complex objects or initial null values require explicit generic types like useState<User | null>(null).Do not turn off strict mode: Keep strict mode active in your tsconfig.json file. It forces you to write safer, cleaner code and catches errors early

## Stacki

- Next.js 16 App Router and React 19
- TypeScript in strict mode
- Bun for packages, scripts, and tests
- Tailwind CSS 4, Radix UI, and Lucide icons
- Zod for runtime validation
- Clerk for authentication
- Stripe for billing
- Turso/libSQL for indexed catalog and user data
- Upstash Redis for caching and rate limiting
- NASA, NOAA, and JPL public data sources

React Compiler is conditionally enabled in `next.config.ts` when its package is
installed. Keep new code compatible with it.

## Essential commands

Prefer `mise` tasks when available. Equivalent scripts are in `package.json`.

```bash
mise run dev
mise run build
mise run lint
bun test

# Turso commands
turso auth login --headless
turso db list
turso db shell [database-name]
```

Run a focused test before broader validation:

```bash
bun test path/to/file.test.ts
bun run lint
bun run build
```

If the environment prevents a full build or test run, run the highest-signal
checks available and report the exact gap.

## Repository layout

- `src/app`: App Router pages and route handlers
- `src/app/api/v1`: public versioned API
- `src/app/api/user`: authenticated user API
- `src/app/api/internal`: internal API
- `src/components`: shared and feature UI
- `src/lib`: data adapters, schemas, auth, caching, and domain logic
- `db/schema.sql`: canonical database schema
- `db/migrations`: ordered database migrations
- `src/lib/openapi/openapi.json`: canonical OpenAPI document
- `src/proxy.ts`: route protection and request proxy behavior

Use `@/*` imports for project modules when practical.

## Implementation rules

- Use TDD for behavioral changes: write or update a failing test first.
- Prefer Server Components. Add `"use client"` only for genuine interactivity.
- Build UI mobile-first and preserve the existing retrofuturistic theme.
- Avoid `useEffect` unless synchronizing with an external system. Do not use it
  for derived state, event handling, or data transformations.
- Validate untrusted input with strict Zod schemas at API boundaries.
- Reuse existing utilities and response patterns before adding dependencies.
- Keep TypeScript strict-friendly; avoid `any` unless documented and necessary.
- Preserve canonical object ID conventions through `src/lib/canonical-id.ts`.
- Treat performance, accessibility, empty/error/loading states, and bounded
  upstream work as part of implementation—not follow-up work.

When planning, explicitly check edge cases, missing implementation details,
performance, cost, security, and failure recovery.

## Data and auth boundaries

- Server authorization uses the database-backed user tier; do not trust client
  state or token claims for entitlement decisions.
- Keep authorization aligned with `src/lib/auth.ts` and `src/proxy.ts`.
- Turso stores catalog indexes and authenticated user data.
- Upstash provides shared cache and rate-limit state; preserve graceful cache
  fallback and fail-safe abuse protection.
- External data adapters live in `src/lib`; keep timeouts, response bounds,
  validation, and degraded behavior intact.
- Do not mutate production data or apply migrations without explicit approval.

## API changes

Any endpoint change under `src/app/api/**` must include:

- Boundary validation
- Authentication/authorization where applicable
- Happy-path and relevant error-path tests
- Rate-limit or abuse considerations
- An update to `src/lib/openapi/openapi.json`

Endpoint work is incomplete until its implementation, tests, and OpenAPI entry
agree on parameters, schemas, status codes, auth, and rate-limit behavior.

## Database changes

- Add a new ordered migration; do not rewrite an already-deployed migration.
- Update `db/schema.sql` in the same change.
- Make migrations safe for existing rows and rolling deployments.
- Test limits, ownership, concurrency, downgrade, and cleanup behavior when
  relevant.

## Security

- Never commit secrets, credentials, production identifiers, or private user
  data.
- Treat every request and external response as untrusted.
- Preserve same-origin checks, rate limiting, ownership checks, webhook
  signature verification, and idempotency.
- Only allow external navigation to explicitly approved HTTPS hosts; validate
  internal destinations before returning them to clients.
- Do not broaden trusted proxy headers or expose internal documentation/routes
  without explicit approval.

## Verification and handoff

- Run focused tests first, then lint and the production build.
- Run `git diff --check` before handoff.
- Preserve unrelated user changes in a dirty worktree.
- Report migrations, external configuration, or production actions still
  required; do not perform them implicitly.

## Git policy

- Never commit or push without explicit user approval.
- When approved, use a clear, descriptive commit message.

## Important gotchas

- This project uses `src/proxy.ts`, not `middleware.ts`.
- Build-time cache access is intentionally disabled; do not reintroduce dynamic
  cache calls during static generation.
- Unversioned public API routes may be compatibility rewrites; edit the
  canonical versioned route and keep the rewrite behavior intact.
