# Pro Launch Runbook

Last updated: 2026-03-26

This document describes the current Pro rollout system:
- public Pro product launch
- centralized server-side launch gate resolution
- direct limit-mode enforcement with no waitlist threshold dependency
- internal rollout status endpoint/page
- alerts intentionally deferred as a future feature
- launch defaults are on unless explicitly disabled

## 1) Environment Flags

Configure these in `.env.local` and the deployed environment:

```env
# Optional overrides. Pro is enabled by default when these are unset.
# Use these only if you need to disable a subsystem or turn Pro off in a specific environment.
PRO_PRODUCT_ENABLED=true
PRO_SURFACES_ENABLED=true
PRO_BILLING_ENABLED=true

# Limit rollout mode: shadow | warn | enforce
LIMIT_MODE=shadow

# Emergency override
LIMIT_MODE_FORCE_ENFORCE=false

# Internal admin access (comma-separated user IDs)
INTERNAL_ADMIN_IDS=user_abc,user_def

# Fallback (legacy)
PRO_ROLLOUT_ADMIN_IDS=user_abc,user_def
```

Legacy waitlist env vars are no longer part of the active rollout:
- `WAITLIST_ENABLED`
- `WAITLIST_ENFORCE_THRESHOLD`
- `NEXT_PUBLIC_WAITLIST_ENABLED`

For the normal production launch path, you do not need to set any Pro enable flags at all.
If they are omitted, product access, billing, and Pro surfaces all default to enabled.

## 2) Effective Mode Resolution

`configuredMode` comes from `LIMIT_MODE`.

All Pro rollout flags are resolved centrally on the server from the non-public env vars above.
Server components pass resolved booleans to client components as props where needed.

`effectiveMode` is resolved as:
1. If `LIMIT_MODE_FORCE_ENFORCE=true` -> `enforce`
2. Else -> `LIMIT_MODE`

There is no longer a waitlist threshold gate between `warn` and `enforce`.

## 3) Launch Behavior

- `PRO_PRODUCT_ENABLED=true`
  - public users can upgrade to Pro
  - Pro checkout, billing management, collections, and other launched Pro surfaces are publicly available
  - `PRO_SURFACES_ENABLED` and `PRO_BILLING_ENABLED` can still be used as safety overrides
- `PRO_PRODUCT_ENABLED=false`
  - public Pro access is disabled for that environment
  - internal admins listed in `INTERNAL_ADMIN_IDS` can still test billing and Pro flows when subsystem overrides are enabled

## 4) Database and Migration Status

Migration status is complete for the current rollout schema:
- `001_pro_features.sql`
- `002_export_history_audit.sql`
- `003_tier_limit_indexes.sql`
- `004_waitlist_interest.sql`

No new migration is required to launch Pro publicly or retire the waitlist from the active rollout path.
The legacy waitlist tables remain in place for now and can be removed later in a cleanup migration if desired.

## 5) UIs and Routes

- Billing page (`/settings/billing`)
  - public upgrade flow is controlled by `PRO_PRODUCT_ENABLED`
  - shows checkout or billing-management controls when available
- Collections pages (`/user/collections`, `/user/collections/[id]`)
  - available when the product gate allows Pro access
- Waitlist page (`/waitlist`)
  - retired from the launch flow and redirected to billing
- Alerts
  - still treated as a future feature for production because scheduled execution and outbound email delivery are not live yet

## 6) API Behavior

- Stripe routes (`/api/stripe/checkout`, `/api/stripe/portal`) return:
  - `403 { error: "feature_disabled", feature: "billing" }`
  when billing is not available for the current user
- Waitlist routes (`/api/waitlist`, `/api/waitlist/status`, `/api/waitlist/unsubscribe`) are retired and return:
  - `410 { error: "feature_retired", feature: "waitlist" }`
- Saved objects, saved searches, and exports still emit limit-policy metadata and record limit-hit interest for internal visibility

## 7) Internal Rollout Status

- Internal status endpoint: `GET /api/internal/pro-rollout-status`
- Internal status page: `/settings/internal/pro-rollout`
- Both remain admin-only
- The status view now focuses on:
  - launch-gate state
  - configured vs effective limit mode
  - recent limit-hit interest metrics

## 8) Operational Checks

1. Verify current prod env values:
   - Pro enable flags may be omitted entirely for the default public-launch behavior
   - if set explicitly, `PRO_PRODUCT_ENABLED=true`
   - if set explicitly, `PRO_BILLING_ENABLED=true`
   - if set explicitly, `PRO_SURFACES_ENABLED=true`
   - `LIMIT_MODE=shadow` or your chosen launch mode
   - `INTERNAL_ADMIN_IDS=<your_user_id>`
2. Open `/settings/internal/pro-rollout` as an internal admin.
3. Exercise billing page behavior as an admin and a non-admin user.
4. Run live checkout, webhook sync, and cancel/manage verification.
5. Verify limit mode transitions:
   - `shadow` -> no blocking
   - `warn` -> no blocking + would-block metadata
   - `enforce` -> blocks at limits

## 9) Known Caveats

- If admin IDs are unset (`INTERNAL_ADMIN_IDS` and fallback `PRO_ROLLOUT_ADMIN_IDS`), the internal status endpoint/page is intentionally hidden (`404`).
- Billing tier can lag immediately after checkout until webhook sync completes; billing UI keeps Manage/Cancel accessible during this window.
- Alerts are not production-ready yet: `/api/cron/check-alerts` is not implemented and no outbound email provider is wired.
- Legacy waitlist tables remain in the database even though the public waitlist flow is retired.
