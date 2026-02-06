Here is a **clean, implementation-ready summary** of everything we
decided over the last few days. This is written so you can hand it
directly to another LLM or use it as your internal design brief.

------------------------------------------------------------------------

# Cosmic Index -- Engineering & Product Summary

This project is an astronomy data platform that aggregates multiple
public scientific sources into a normalized, indexed, fast, and reliable
product.

The value of the product is: → normalization, indexing, relationships,
stable pagination, and caching over fragile upstream APIs.

------------------------------------------------------------------------

# 1. Core Domains (Do not mix these)

You must treat the data as three separate domains.

### A. Catalog objects

These are stable entities.

- Exoplanets
- Stars (host stars)
- Small bodies (asteroids & comets)
- (Later) meteorites / fireballs

These use the `CosmicObject` model.

### B. Event streams

These are time-based.

- Space weather (DONKI)
- Fireballs / atmospheric impacts

Do NOT force them into `CosmicObject`.

### C. Media

- NASA Images
- APOD

Do NOT mix media into object models.

------------------------------------------------------------------------

# 2. Data sources to use

## Exoplanets & host star properties

NASA Exoplanet Archive -- TAP API

Table:

    ps

Used columns:

Planet:

- pl_name
- hostname
- discoverymethod
- disc_year
- pl_orbper
- pl_rade
- pl_masse
- pl_eqt

System / star:

- sy_snum
- sy_pnum
- sy_dist
- ra
- dec

Stellar:

- st_spectype
- st_teff
- st_mass
- st_rad
- st_lum
- st_met
- st_age
- sy_vmag
- sy_kmag

------------------------------------------------------------------------

## Small bodies

JPL Small-Body Database (SBDB)

Endpoints:

Browse / index:

    https://ssd-api.jpl.nasa.gov/sbdb_query.api

Detail:

    https://ssd-api.jpl.nasa.gov/sbdb.api

------------------------------------------------------------------------

## Space weather

NASA DONKI

Use only initially:

- FLR (solar flares)
- CME
- GST

These form a `/space-weather` feature.

------------------------------------------------------------------------

## Fireballs

CNEOS fireball API (JPL / SSD)

Use for recent atmospheric impact events.

------------------------------------------------------------------------

## Media

NASA Image and Video Library API

Used only on detail pages. Do not fetch images for browse lists.

Also integrate APOD for a daily highlight.

------------------------------------------------------------------------

# 3. Critical architectural decision

Upstream APIs (TAP, JPL, DONKI) are slow, fragile and do not paginate
correctly.

Your app must follow:

**Source = truth Local index = product**

------------------------------------------------------------------------

# 4. Indexing strategy (very important)

## Exoplanets

Current:

- Local Turso index for browse/search (same DB as stars).
- Ingestion script `scripts/ingest-exoplanets.ts` from NASA TAP with checkpointing.
- Browse: `src/lib/exoplanet-index.ts` → Turso (no TAP fallback).
- Detail: by slug from Turso + cache.

------------------------------------------------------------------------

## Stars (host stars)

Stars must be indexed locally.

Reason:

- TAP returns many duplicate rows per hostname
- GROUP BY fixes duplication but pagination is still fragile
- browse/search must be fast and stable

Design:

Use SQLite (Turso locally or VPS file) as a star index.

Browse/search: → SQLite

Planets in system: → live TAP query filtered by hostname

------------------------------------------------------------------------

### Stars ingestion strategy

Ingestion script:

Keyset pagination using hostname:

    SELECT
     hostname,
     COUNT(DISTINCT pl_name) AS planet_count,
     MAX(sy_pnum),
     MAX(sy_snum),
     MAX(st_spectype),
     MAX(st_teff),
     MAX(st_mass),
     MAX(st_rad),
     MAX(st_lum),
     MAX(st_met),
     MAX(st_age),
     MAX(sy_dist),
     MAX(sy_vmag),
     MAX(sy_kmag),
     MAX(ra),
     MAX(dec)
    FROM ps
    WHERE default_flag=1
    AND hostname > '{lastHostname}'
    GROUP BY hostname
    ORDER BY hostname ASC

Batch size: \~2000

Upsert into SQLite.

Derive:

    spectral_class = first letter of st_spectype

------------------------------------------------------------------------

## Small bodies

You should index small bodies for browse/search.

Use a minimal index table:

Fields:

- slug
- spkid
- pdes
- display_name
- kind
- orbit_class
- neo
- pha
- diameter
- H

Browse/search: → local index

Detail: → live JPL lookup + cache

------------------------------------------------------------------------

# 5. Meteorites / fireballs

The large 12MB meteorite JSON:

→ ingest once into SQLite → simple table → browse/search from DB

But: for a live feature, prefer CNEOS fireballs instead of static
meteorite landings.

------------------------------------------------------------------------

# 6. APIs to build in your app

### Catalog APIs

- GET /api/exoplanets

- GET /api/exoplanets/\[id\]

- GET /api/stars

- GET /api/stars/\[id\]

- GET /api/stars/\[id\]/planets

- GET /api/small-bodies

- GET /api/small-bodies/\[id\]

### Event APIs

- GET /api/space-weather
- GET /api/fireballs

### Media APIs

- GET /api/images
- GET /api/apod

------------------------------------------------------------------------

# 7. Shared TAP client

You must extract a shared module:

    src/lib/nasa-tap.ts

Exports:

- executeTAPQuery()
- escapeAdqlString()
- sanitizeForLike()

Both exoplanet and stars clients must use this.

POST TAP requests only.

------------------------------------------------------------------------

# 8. Pagination rules

TAP browsing:

- no OFFSET support
- must fetch maxrec = offset + limit
- must clamp:

<!-- -->

    MAX_OFFSET
    MAX_PAGE

Deep paging must be rejected unless filters are applied.

Local DB browsing:

- standard LIMIT/OFFSET
- stable ordering

------------------------------------------------------------------------

# 9. UI features to build

## Stars feature

- /stars browse page

- filters:

  - spectral class
  - min planets
  - max distance
  - sort

- star cards

- star detail page

- planets-in-system section

------------------------------------------------------------------------

## Media gallery

On detail pages only:

- thumbnail strip

- lightbox

- fallback queries:

  - exoplanet name → host star
  - small body name → name + type

Graceful empty state.

------------------------------------------------------------------------

## Space weather

- timeline feed
- filters by type
- severity where available

------------------------------------------------------------------------

## Fireballs

- recent events list
- map view later

------------------------------------------------------------------------

## APOD

- homepage daily card

------------------------------------------------------------------------

# 10. Caching strategy

Upstash Redis:

- exoplanet detail
- star planets list
- small body detail
- images
- DONKI
- fireballs
- APOD

TTL:

- events: 15--60 minutes
- images: 24 hours
- object detail: 24--72 hours

Browse endpoints should ideally hit local DB only.

------------------------------------------------------------------------

# 11. Monetization strategy

Do NOT rely on ads.

Primary monetization paths:

### Pro user tier

- saved objects
- saved searches
- collections
- alerts (space weather + fireballs)
- CSV/JSON exports

Target price: \$3--7/month

------------------------------------------------------------------------

### API tier

Expose normalized APIs:

- objects
- stars
- systems
- space weather

Your value: clean schema, caching, pagination, dedup, relationships.

------------------------------------------------------------------------

### Education tier

- classroom accounts
- shared collections

------------------------------------------------------------------------

# 12. Accounts

Use:

- Clerk or Auth.js
- Stripe for billing

Do not build authentication yourself.

------------------------------------------------------------------------

# 13. Deployment & ingestion

Current stack:

- Vercel
- Turso
- Upstash

Ingestion options:

- manual script run on deploy
- GitHub Actions scheduled job
- Vercel cron (if still free)
- local ingestion + upload DB file

Cheapest reliable approach: → GitHub Actions cron + commit or upload DB
artifact

------------------------------------------------------------------------

# 14. Important design principles

- Do not store full upstream objects unless needed
- Index only what you browse/search
- Detail always comes from source + cache
- Events and catalog objects remain separate models
- Media remains separate

------------------------------------------------------------------------

# 15. Why this architecture matters

Your product is:

A normalized scientific data layer built on unreliable public APIs.

The data sources are not your product.

The indexing, relationships, pagination, caching and schema stability
are the product.

This is what enables:

- monetization
- API access
- alerts
- saved searches
- performance
- reliability

------------------------------------------------------------------------

# 16. Progress Tracker

> **Last updated:** 2026-02-05

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
| **Pro Tier Backend** | Full implementation - see details below |

### Pro Tier Implementation (Code Complete)

| Component | Files |
|-----------|-------|
| Authentication | `src/middleware.ts`, `src/lib/auth.ts`, `src/lib/user-db.ts`, `src/components/auth/` |
| Database Schema | `db/migrations/001_pro_features.sql` (users, saved_objects, collections, saved_searches, alerts, stripe_events) |
| Saved Objects API | `src/app/api/user/saved-objects/` (GET, POST, PATCH, DELETE, check) |
| Collections API | `src/app/api/user/collections/` (CRUD + items) |
| Saved Searches API | `src/app/api/user/saved-searches/` (with hash deduplication) |
| Alerts API | `src/app/api/user/alerts/` (CRUD) |
| Export API | `src/app/api/user/export/` (streaming CSV/JSON, 5000 row limit) |
| Stripe Integration | `src/app/api/stripe/checkout/`, `src/app/api/stripe/portal/`, `src/app/api/webhooks/stripe/` |
| UI Components | `src/components/save-button.tsx`, `src/components/pro-badge.tsx` |
| Billing Page | `src/app/settings/billing/` |
| Utilities | `src/lib/canonical-id.ts`, `src/lib/saved-searches.ts`, `src/lib/stripe.ts` |

## 🚧 In Progress (Your Action Required)

| Task | Description |
|------|-------------|
| **Clerk Setup** | Create Clerk app, add env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) |
| **Stripe Setup** | Create product/price, configure webhook, add env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`) |
| **Run Migration** | `turso db shell cosmic-index < db/migrations/001_pro_features.sql` |

## 📋 Up Next (Priority Order)

1. **Integrate SaveButton** - Add to ObjectCard, detail pages, event cards *(needs Clerk)*
2. **User Dashboard Pages** - `/user/saved-objects`, `/user/collections` *(needs Clerk)*
3. **Saved Searches UI** - Dropdown in filter panels *(needs Clerk)*
4. **Export Button** - Add to browse pages *(needs Clerk)*

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