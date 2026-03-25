# Pro Tier TODOs (Current)

Last updated (UTC): 2026-03-25

This file tracks only remaining rollout work to avoid repeating status already covered in `APP-TODO.md`.

## Completed Baseline

- [x] Auth foundation (`src/proxy.ts`, auth utilities, app auth provider)
- [x] Core Pro schema migrations applied (`001`-`004`)
- [x] Saved objects, collections, saved searches, alerts, and export APIs/UI
- [x] Stripe checkout, webhook handling, and billing settings page
- [x] Stripe portal fallback recovery + manage/cancel billing UX

## Remaining Work

### Production Cutover

- [ ] Validate deployed Clerk configuration and production keys
- [ ] Configure Stripe live product/price and webhook endpoint
- [ ] Verify Stripe Customer Portal branding/config in live mode
- [ ] Run production checkout -> webhook -> cancel lifecycle verification

### Alerts Delivery

- [ ] Keep alerts positioned as a future feature in production until delivery infrastructure is complete
- [ ] Add scheduled alert runner (`/api/cron/check-alerts`)
- [ ] Integrate outbound email provider (Resend or SendGrid)
- [ ] Add alert email templates and manual verification checklist

### Performance Follow-Through

- [ ] Execute P0 items from `docs/performance-strategies.md`:
  - cursor pagination for large user datasets
  - conditional GET (`ETag` / `If-None-Match`)
  - targeted DB index audit with query-plan validation
- [ ] Capture pre/post metrics (P50/P95 + client interaction latency) for user routes

### Product Polish

- [ ] Add clearer upgrade prompts when free users hit Pro limits
- [ ] Add onboarding flow for new Pro subscribers
- [ ] Audit loading/error states for remaining async paths
