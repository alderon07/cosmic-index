
# Progress Tracker 

> **Last updated:** 2026-04-05

Status snapshot:
- Former `feature/pro-tier` work is already deployed to production.
- Clerk is configured in production.
- Stripe live setup is still pending.
- Google OAuth remains blocked until the app is published.

## ✅ Completed

| Feature | Description |
|---------|-------------|
| Exoplanets | Browse + detail, local Turso index + ingest from NASA TAP |
| Stars | Local Turso index, browse + detail, planets-in-system |
| Small Bodies | Browse + detail, dual-strategy JPL search |
| Close Approaches | CNEOS API integration, browse page with cards, tooltips |
| Redis Caching | Upstash integration with TTL strategy |
| Rate Limiting | Sliding window limiter via Redis |
| APOD | Homepage daily card with NASA APOD API (`/api/apod`) |
| Fireballs | CNEOS fireball API, browse page with incomplete data handling (`/api/fireballs`) |
| Space Weather | NASA DONKI integration for FLR, CME, GST with aurora-violet theme (`/api/space-weather`, `/space-weather`) |
| Space Weather SEO | Added layout.tsx with metadata, OpenGraph, Twitter cards, canonical URL |
| Space Weather UX | Linked events show event types (e.g., "1 Flare, 2 CMEs"); list view has hover nav icon (open in new tab / chevron) |
| Space Weather Detail | `/space-weather/[id]` page with full event info and source links |
| Keyboard Shortcuts | GitHub-style `g` prefix navigation, page actions (`f`, `v`, `j`, `k`), help dialog (`?`), search focus (`/`, `Ctrl+K`) |
| Media Gallery | NASA Image Library on detail pages with thumbnails, lightbox, fallback queries (`/api/images/object`) |
| Compare System | Multi-domain compare tray for exoplanets, stars, and small bodies with canonical IDs, dedupe, max-item guards, and clear+retry flow |
| Compare Reliability | Storage version/domain validation + repair/reset logic, one-time reset messaging, domain allowlist via `COMPARE_DOMAINS`, and conflict-safe persistence |
| Compare Analytics | Added `compare_action_result`, `compare_tray_open`, `compare_dialog_open`, blocked reason codes, and storage reset/parse metrics |
| Saved Objects UX | `/user/saved-objects` has export button, refresh indicator, canonical detail-link resolution, and backward-compatible exoplanet ID handling |
| Saved Searches UI | Saved search controls integrated into exoplanets, stars, and small bodies browse pages |
| Saved Search Modal UX | Replaced browser `prompt()` with themed in-app dialog for naming saved searches |
| Save Controls | Save buttons active on object + event cards/details, with consistent heart icon treatment across objects, weather, and fireballs |
| Free Export Guardrail | Free tier export requests limited to **1 per hour** (`EXPORT_REQUESTS_PER_HOUR`) |
| Database Migrations | Applied all current migrations (`001_pro_features.sql`, `002_export_history_audit.sql`, `003_tier_limit_indexes.sql`, `004_waitlist_interest.sql`) |
| Stripe Billing UX | Added Billing nav entry in user menu, in-page API error messaging, and explicit **Manage or Cancel** actions on billing |
| Stripe Billing Sync UX | Billing page now handles post-checkout sync lag explicitly (shows sync state and keeps **Manage or Cancel** available) |
| Stripe Portal Reliability | Added customer-linkage recovery via `users.stripe_customer_id` and `stripe_subscriptions`, plus route tests for portal recovery paths |
| **Pro Tier Backend** | Full implementation - see details below |

### Pro Tier Implementation (Deployed)

| Component | Files |
|-----------|-------|
| Authentication | `src/proxy.ts`, `src/lib/auth.ts`, `src/lib/user-db.ts`, `src/components/auth/` |
| Database Schema | `db/migrations/001_pro_features.sql` (users, saved_objects, collections, saved_searches, alerts, stripe_events) |
| Saved Objects API | `src/app/api/user/saved-objects/` (GET, POST, PATCH, DELETE, check) |
| Collections API | `src/app/api/user/collections/` (CRUD + items) |
| Saved Searches API | `src/app/api/user/saved-searches/` (with hash deduplication) |
| Alerts API | `src/app/api/user/alerts/` (CRUD) |
| Export API | `src/app/api/user/export/` (streaming CSV/JSON, 5000 row limit) |
| Stripe Integration | `src/app/api/stripe/checkout/`, `src/app/api/stripe/portal/`, `src/app/api/webhooks/stripe/` |
| UI Components | `src/components/save-button.tsx`, `src/components/save-event-button.tsx`, `src/components/export-button.tsx`, `src/components/saved-search-controls.tsx`, `src/components/pro-badge.tsx`, `src/components/compare/` |
| Billing Page | `src/app/settings/billing/` |
| Utilities | `src/lib/canonical-id.ts`, `src/lib/saved-searches.ts`, `src/lib/stripe.ts` |

## 🚧 In Progress (Your Action Required)

| Task | Description |
|------|-------------|
| **Stripe Production Setup** | Validate live product/price, webhook endpoint, and production env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`) |
| **Google OAuth Publication** | Publish the app before treating Google OAuth as production-ready |

## 📋 Up Next (Priority Order)

1. **Finish Production Launch Blockers** - Complete Stripe live setup and publish the app before treating Google OAuth as production-ready.
2. **Post-Migration Verification** - Document completed production Turso migration checks, rollback notes, and validation queries.
3. **Compare UX QA Sweep** - Validate card/tray/dialog theming and behavior on all domains, including mobile viewport fit and conflict recovery.
4. **Saved Objects Link QA** - Verify `Open details` routing with real (non-mock) saved data for all canonical ID types.

## 🔮 Future / Lower Priority

### Pro Tier Polish
- Alert cron job (`/api/cron/check-alerts`) + email notifications
- Upgrade prompts for free users hitting Pro features
- Onboarding flow for new Pro subscribers

### Space Weather
- Linked event navigation - click linked events to navigate to them
- Event correlation view - visualize FLR → CME → GST causal chains

### Infrastructure
- Small Bodies local index (move from live JPL to SQLite)
- Shared TAP client extraction (`src/lib/nasa-tap.ts`)

### Monetization
- API tier (normalized public API access)
- Education tier (classroom accounts, shared collections)
