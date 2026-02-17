# CLI Auth Roadmap (Clerk + Device Flow)

Last updated: 2026-02-17
Status: Planning only (no implementation yet)

## 1) Purpose

Define a secure path for a future public `cosmic-index` CLI release (Homebrew/Linux/macOS/WSL) using Clerk-based authentication.

This is a roadmap/spec only. CLI rollout is explicitly deferred until demand is validated.

## 2) Launch Gate (Required)

Start implementation only when both are true:

- CLI waitlist reaches `60+`
- CLI-specific support/inbound requests reach `20+` per month

Until then: no CLI launch work beyond planning docs.

## 3) Locked Product Decisions

- Auth provider: `Clerk`
- CLI login UX: `OAuth device flow`
- Security posture: login required for all CLI commands
- Session model: single-device sessions
- Host policy at launch: official host only
- Current constraint: no dedicated API domain yet (future objective)

## 4) Current Constraint and Risk

Today, Vercel edge challenge/firewall behavior can block automated CLI traffic before app auth logic runs.

Implication:

- Even correct Clerk auth may not fully solve transport reliability while using the current public host.
- A dedicated API host remains the long-term reliability fix, but is out of scope now.

## 5) Future Architecture (Target)

When launch gate is met, implement:

- CLI auth endpoints under `src/app/api/cli/v1/auth/*`
- CLI data endpoints under `src/app/api/cli/v1/*` (auth-required)
- Clerk-backed user identity binding for CLI-issued sessions/tokens
- Token model:
  - short-lived access token (~15 min)
  - rotating refresh token (~30 days)
  - replay detection + revocation
- Per-device session management (single device per login session)

## 6) API Surface (Planned)

### Auth endpoints

- `POST /api/cli/v1/auth/device/start`
- `POST /api/cli/v1/auth/device/poll`
- `POST /api/cli/v1/auth/refresh`
- `POST /api/cli/v1/auth/logout`
- `GET /api/cli/v1/me`

### CLI data endpoints (auth required)

Mirror current CLI-used read routes under `/api/cli/v1/*`:

- exoplanets
- stars
- small-bodies
- close-approaches
- fireballs
- space-weather
- apod

Do not change existing `/api/v1/*` behavior for web/public paths during initial CLI rollout.

## 7) Clerk Integration Plan (High-Level)

- Use Clerk OAuth/device-capable flow for CLI login approval.
- Browser step confirms user login and approves device code.
- Server exchanges approved device grant into CLI tokens.
- CLI stores credentials in OS secure storage (keychain/credential manager), never plain logs.

## 8) Data Model Additions (Planned)

New DB tables (migration planned for later):

- `cli_device_grants`
- `cli_sessions`
- optional `cli_refresh_audit`

Security rules:

- store token/code hashes only (no plaintext)
- rotate refresh token every refresh
- revoke session family on replay detection

## 9) CLI UX (Planned)

New commands:

- `cosmic-index login`
- `cosmic-index whoami`
- `cosmic-index logout`

Behavior:

- all existing commands require login
- unauthenticated calls return actionable error with `cosmic-index login`
- `--base-url` not supported for official authenticated mode at launch (official host only)

## 10) Testing Requirements (Planned)

### API tests

- device start/poll success and error states
- approval/deny/expire paths
- refresh rotation and replay revocation
- auth-required enforcement on all `/api/cli/v1/*` routes

### CLI tests

- login happy path
- token refresh on expiry
- logout revocation + local credential clear
- unauthenticated command guidance

### Integration

- end-to-end device flow: CLI -> browser approval -> CLI success

## 11) OpenAPI + Docs Policy

When implementation starts:

- update `src/lib/openapi/openapi.json` for all new `/api/cli/v1/*` routes
- document auth scheme, error codes, and token lifecycle
- update `cli/README.md` for login-first flow

## 12) Deferred Items

- Dedicated API domain migration (`api.cosmic-index.com`) is deferred but recommended for long-term transport reliability.
- Go backend migration is not required for this auth strategy and is not part of this roadmap.

## 13) Out of Scope (Now)

- Any production CLI rollout
- Any bypass-secret based public auth
- Any broad infrastructure migration
