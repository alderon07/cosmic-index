# Pro Rollout Runbook (Feature-Flagged)

Last updated: 2026-03-25

This document describes the implemented Pro rollout system:
- feature-flagged Pro surfaces/billing
- waitlist-driven limit enforcement
- free-tier-safe interest tracking
- internal rollout status endpoint/page
- centralized server-side Pro gate resolution

## 1) Environment Flags

Configure these in `.env.local` (and Vercel env vars for deployed environments):

```env
# Public Pro launch switch
PRO_PRODUCT_ENABLED=false

# Pro surface visibility
# Optional override. Defaults to PRO_PRODUCT_ENABLED when unset.
PRO_SURFACES_ENABLED=true

# Stripe billing availability
# Optional override. Defaults to PRO_PRODUCT_ENABLED when unset.
PRO_BILLING_ENABLED=true

# Waitlist gate
# Optional override. Defaults to !PRO_PRODUCT_ENABLED when unset.
WAITLIST_ENABLED=true
WAITLIST_ENFORCE_THRESHOLD=125

# Limit rollout mode: shadow | warn | enforce
LIMIT_MODE=shadow

# Emergency override
LIMIT_MODE_FORCE_ENFORCE=false

# Admin access (comma-separated user IDs)
INTERNAL_ADMIN_IDS=user_abc,user_def
# Fallback (legacy)
PRO_ROLLOUT_ADMIN_IDS=user_abc,user_def
```

## 2) Effective Mode Resolution

`configuredMode` comes from `LIMIT_MODE`.

All Pro rollout flags are resolved centrally on the server from the non-public env vars above.
Server components pass the resolved booleans to client components as props where needed.

Central launch behavior:
- `PRO_PRODUCT_ENABLED=false`
  - public users stay on free-tier behavior
  - Pro checkout/portal/collections/alerts remain closed to the public
  - internal admins listed in `INTERNAL_ADMIN_IDS` can still test billing and Pro flows in production
  - waitlist defaults to enabled
- `PRO_PRODUCT_ENABLED=true`
  - Pro becomes publicly available
  - `PRO_SURFACES_ENABLED` and `PRO_BILLING_ENABLED` default to enabled if not explicitly overridden
  - waitlist defaults to disabled if not explicitly overridden

`effectiveMode` is resolved as:
1. If `LIMIT_MODE_FORCE_ENFORCE=true` -> `enforce`
2. Else if `LIMIT_MODE != enforce` -> same as configured
3. Else if waitlist disabled -> `enforce`
4. Else if active waitlist count >= threshold -> `enforce`
5. Else -> `warn`

## 3) Database Migration

Migration status is complete for the current rollout schema:

- `001_pro_features.sql`
- `002_export_history_audit.sql`
- `003_tier_limit_indexes.sql`
- `004_waitlist_interest.sql`

`004_waitlist_interest.sql` added:
- `pro_waitlist`
- `pro_interest_daily`
- `pro_interest_dedup`

## 4) APIs Added

### Waitlist
- `POST /api/waitlist`
  - requires authenticated user
  - body: `{ email, source }`
  - sources: `billing | limit_saved_objects | limit_saved_searches | limit_exports | pro_badge`
  - responses: `joined | already_joined | reactivated`
- `GET /api/waitlist/status`
  - returns count/threshold + configured/effective modes
- `POST /api/waitlist/unsubscribe`
  - authenticated user unsubscribe

### Internal rollout status
- `GET /api/internal/pro-rollout-status`
  - admin-only
  - returns waitlist status, today/7d interest aggregates, mode status
  - returns `404` if both `INTERNAL_ADMIN_IDS` and fallback `PRO_ROLLOUT_ADMIN_IDS` are empty
  - returns `X-Robots-Tag: noindex, nofollow`

## 5) UIs Added/Updated

- Billing page (`/settings/billing`)
  - public upgrade flow is controlled by `PRO_PRODUCT_ENABLED`
  - admin/testing access is still possible when product is off and billing is explicitly enabled
  - shows waitlist CTA while product is not publicly available
  - shows **Manage or Cancel** controls with explicit post-checkout sync messaging
- Collections pages (`/user/collections`, `/user/collections/[id]`)
  - stay closed to the public until Pro is launched
  - show a launch/waitlist notice instead of the management UI
- Alerts UI/API
  - implemented behind the Pro gate for future rollout work
  - not part of the current production cutover because scheduled execution and outbound email delivery are not live yet
- Internal status page (`/settings/internal/pro-rollout`)
  - admin-only, noindex

## 6) Route Behavior Changes

These routes now apply `shadow/warn/enforce` behavior and include limit-policy metadata:
- `POST /api/user/saved-objects`
- `POST /api/user/saved-searches`
- `POST /api/user/export`

In `shadow/warn`, the system records limit-hit interest but does not block.
In `enforce`, existing block behavior is preserved.

## 7) Stripe and Pro Surface Gating

- `PRO_PRODUCT_ENABLED` is the primary public launch flag.
- Stripe routes (`/api/stripe/checkout`, `/api/stripe/portal`) return:
  - `403 { error: "feature_disabled", feature: "billing" }`
  when billing is not available for the current user.
- Portal route supports customer-recovery fallback (`stripe_subscription_id`, then email lookup) when `stripe_customer_id` is missing.
- Alerts routes are gated by launch access plus `PRO_SURFACES_ENABLED`.
- Alerts should be treated as a future feature for production rollout until the scheduled runner and email delivery path are implemented.
- Collections routes are gated by launch access.
- Waitlist join/unsubscribe routes close automatically once Pro is publicly live unless the caller is an internal admin.

## 8) Rate Limits and Free-Tier Safety

Waitlist write path uses Upstash:
- per-IP: `5 / 15 min`
- per-email hash: `3 / 24h`

If waitlist rate-limit backend is unavailable, waitlist writes fail closed (`503`).
Limit-hit counters are best-effort and non-fatal to user requests.

## 9) Data Semantics and Retention

- Daily aggregates use UTC (`YYYY-MM-DD`).
- Waitlist threshold uses all-time active rows (`status='active'`).
- Opportunistic cleanup:
  - old `unsubscribed|converted` waitlist rows (> 90d)
  - old dedup rows (> 120d)

## 10) Operational Checks

1. Verify migration ran successfully.
2. Verify `INTERNAL_ADMIN_IDS` is set for your admin user (or fallback `PRO_ROLLOUT_ADMIN_IDS`).
3. Check `GET /api/waitlist/status`.
4. Open `/settings/internal/pro-rollout` as admin.
5. For prelaunch prod testing, set:
   - `PRO_PRODUCT_ENABLED=false`
   - `PRO_BILLING_ENABLED=true`
   - `PRO_SURFACES_ENABLED=true`
   - `INTERNAL_ADMIN_IDS=<your_user_id>`
6. Exercise billing page behavior as admin and as a non-admin user.
7. When ready for launch, flip `PRO_PRODUCT_ENABLED=true`.
6. Verify `LIMIT_MODE` transitions:
   - `shadow` -> no blocking
   - `warn` -> no blocking + would-block metadata
   - `enforce` -> blocks at limits

## 11) Known Caveats

- If admin IDs are unset (`INTERNAL_ADMIN_IDS` and fallback `PRO_ROLLOUT_ADMIN_IDS`), internal status endpoint/page is intentionally hidden (`404`).
- Waitlist writes require both Turso and Upstash availability in current fail-closed policy.
- Billing tier can lag immediately after checkout until webhook sync completes; Billing UI keeps Manage/Cancel accessible during this window.
- Alerts are not production-ready yet: `/api/cron/check-alerts` is not implemented and no outbound email provider is wired, so alerts should remain a future feature for now.
- In `enforce` mode with waitlist enabled, low waitlist volume can keep effective mode at `warn` unless force-enforced.
- Public launch and subsystem readiness are intentionally separate: `PRO_PRODUCT_ENABLED` controls customer exposure, while `PRO_BILLING_ENABLED` and `PRO_SURFACES_ENABLED` can still be used as internal safety overrides.
