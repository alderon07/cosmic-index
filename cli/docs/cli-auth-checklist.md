# CLI Auth Implementation Checklist

Last updated: 2026-02-17
Status: Not started (gated)

## 0) Demand Gate (must pass before any build work)

- [ ] Waitlist is `>= 60`
- [ ] CLI-specific requests are `>= 20/month`
- [ ] Product decision to start CLI implementation is confirmed

## 1) Security/Architecture Freeze

- [ ] Confirm Clerk as auth provider for CLI
- [ ] Confirm OAuth device flow as login UX
- [ ] Confirm login is required for all CLI commands
- [ ] Confirm single-device sessions
- [ ] Confirm official-host-only policy for authenticated CLI mode
- [ ] Confirm no bypass-secret based public auth

## 2) API Design and Contracts

- [ ] Specify request/response schemas for:
- [ ] `POST /api/cli/v1/auth/device/start`
- [ ] `POST /api/cli/v1/auth/device/poll`
- [ ] `POST /api/cli/v1/auth/refresh`
- [ ] `POST /api/cli/v1/auth/logout`
- [ ] `GET /api/cli/v1/me`
- [ ] Define CLI data route parity under `/api/cli/v1/*`
- [ ] Define all auth and rate-limit error codes

## 3) Database and Token Lifecycle

- [ ] Draft migration `db/migrations/005_cli_auth.sql`
- [ ] Add `cli_device_grants`
- [ ] Add `cli_sessions`
- [ ] Add `cli_refresh_audit` (optional)
- [ ] Store hashed token/code values only
- [ ] Implement refresh token rotation
- [ ] Implement replay detection and family/session revocation

## 4) Server Implementation

- [ ] Add `src/lib/cli-auth.ts` (token/device/session logic)
- [ ] Add auth routes under `src/app/api/cli/v1/auth/*`
- [ ] Add protected CLI data routes under `src/app/api/cli/v1/*`
- [ ] Enforce bearer auth middleware on all CLI routes
- [ ] Reuse existing rate-limit primitives with stricter auth endpoint limits
- [ ] Ensure existing `/api/v1/*` behavior is unchanged

## 5) CLI Implementation

- [ ] Add `cosmic-index login`
- [ ] Add `cosmic-index whoami`
- [ ] Add `cosmic-index logout`
- [ ] Add token refresh flow in HTTP client
- [ ] Add credential persistence in OS secure storage
- [ ] Add unauthenticated error guidance for all commands
- [ ] Keep official host default; reject authenticated custom host mode

## 6) Docs and Spec

- [ ] Update `src/lib/openapi/openapi.json` for all `/api/cli/v1/*` endpoints
- [ ] Update `cli/README.md` for login-first usage
- [ ] Document token/session lifecycle and revocation behavior
- [ ] Document deployment caveat for current host challenge behavior

## 7) Testing

- [ ] API unit tests for device start/poll states
- [ ] API tests for refresh rotation and replay revocation
- [ ] API tests for logout/session revoke
- [ ] API tests for auth-required enforcement on CLI routes
- [ ] CLI tests for login/logout/whoami
- [ ] CLI tests for refresh-on-expiry behavior
- [ ] Integration test: CLI -> browser approval -> authenticated API call

## 8) Release Readiness

- [ ] Security review completed
- [ ] Rate-limit thresholds validated
- [ ] Observability/metrics dashboards ready
- [ ] Rollout plan documented
- [ ] Rollback plan documented
