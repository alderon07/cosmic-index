# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cosmic Index is a retrofuturistic web encyclopedia for exploring cosmic objects. It aggregates data from NASA's Exoplanet Archive (5,000+ exoplanets, 4,500+ host stars) and JPL's Small-Body Database (1,000,000+ asteroids/comets) into a unified browsing interface.

## Commands

The project uses a [justfile](justfile). Run `just` or `just --list` to see all recipes.

```bash
just dev              # Start dev server with Turbopack (port 3000)
just build            # Production build
just lint             # Run ESLint
just sbdb:diag        # Run JPL SBDB API diagnostic
just ingest-stars     # Ingest host stars from NASA into Turso
just ingest-stars-reset   # Reset checkpoint + ingest stars
just ingest-exoplanets    # Ingest exoplanets into Turso
just ingest-exoplanets-reset
just ingest-all       # Stars then exoplanets (reset + ingest each)
```

Equivalent without just: `bun run dev`, `bun run ingest:stars`, etc. (see package.json scripts).

## Architecture

### Data Flow

```
External APIs → API Clients (src/lib/) → API Routes (src/app/api/) → React Components
                     ↓
              Redis Cache (Upstash)
              Turso Database (Stars index)
```

### Three Data Sources with Different Strategies

**NASA Exoplanet Archive** (`src/lib/nasa-exoplanet.ts`):

- Uses TAP API with ADQL queries
- Query building with SQL injection prevention via `escapeADQL()`
- Direct pagination with bounded offsets

**JPL Small-Body Database** (`src/lib/jpl-sbdb.ts`):

- Dual-strategy search with fallback:
  1. Primary: `sb-cdata` API with regex-based search (comprehensive)
  2. Fallback: Lookup API with `sstr` parameter (fast)
- Complex slug resolution for various designation formats (provisional, periodic comets, numbered asteroids)

**Stars Index** (`src/lib/star-index.ts`):

- Turso (hosted SQLite) database for fast browse/search
- Data sourced from NASA Exoplanet Archive via ingestion script
- Avoids TAP pagination issues (dedup-after-paging breaks offsets)
- Planets fetched from TAP API on detail page (cached in Redis)

### Unified Data Model

All cosmic objects implement `CosmicObject` base interface (`src/lib/types.ts`):

- `ExoplanetData` extends with: hostStar, discoveryMethod, orbitalPeriodDays, radiusEarth, massEarth
- `SmallBodyData` extends with: bodyKind, orbitClass, isNeo, isPha, diameterKm
- `StarData` extends with: hostname, spectralClass, starTempK, planetCount, distanceParsecs

### Caching & Rate Limiting

- Redis caching via Upstash with TTL (12h browse, 24h-7d detail)
- Both cache and rate limiter gracefully degrade when Redis unavailable (in-memory fallback)

**Rate Limiting** (`src/lib/rate-limit.ts`):

- Atomic sliding window using a Lua script executed via `@upstash/redis` `createScript()` (EVALSHA)
- Per-type limits: BROWSE (100/min), DETAIL (200/min), SITEMAP (10/hour)
- Global per-client cap: 300 req/min across all endpoint types (checked in `api-middleware.ts`)
- Burst smoothing micro-windows: e.g., BROWSE max 20 per 10s, DETAIL max 40 per 10s
- Denied requests do NOT consume rate limit slots (the Lua script only ZADDs on allow)
- Redis keys namespaced: `ratelimit:cosmic:${NODE_ENV}:${type}:<clientId>`

**Client Identification** (three-tier with confidence-based scaling):

1. **IP** (`confidence: "ip"`, full limits): Extracted from provider headers (CF-Connecting-IP, Fly-Client-IP — gated by `TRUST_CLOUDFLARE_HEADERS` / `TRUST_FLY_HEADERS` env vars), then `x-forwarded-for` (first hop), then `x-real-ip`. All validated with `net.isIP()`.
2. **Fingerprint** (`confidence: "fingerprint"`, half limits): DJB2 hash of `User-Agent + Sec-CH-UA + Accept-Language`. Used when no valid IP is found but browser headers exist.
3. **Unknown** (`confidence: "unknown"`, 1/10th limits): No identifying information at all. Replaces the old shared `"anonymous"` bucket.

### Input Validation

- All query parameters validated with Zod schemas
- Unicode NFKC normalization on user input
- ADQL string escaping for exoplanet queries
- Regex escaping and wildcard stripping for small body queries

## Key Patterns

### Slug System for URL-Safe IDs

Objects use slugs derived from names. Small body slug resolution (`parseSlugToSearchTerm`) handles:

- Provisional designations: `2025-y3-panstarrs` → `2025 Y3`
- Periodic comets: `1p-halley` → `1P`
- Modern comets: `c-2021-a1-leonard` → `C/2021 A1`
- Numbered asteroids: `433-eros` → `433`

### API Response Structure

All list endpoints return `PaginatedResponse<T>` with: objects, total, page, limit, hasMore

### Environment Variables

```
UPSTASH_REDIS_REST_URL       # Optional: Redis cache + rate limiting
UPSTASH_REDIS_REST_TOKEN     # Optional: Redis cache + rate limiting
TURSO_DATABASE_URL           # Required for Stars: Turso database URL
TURSO_AUTH_TOKEN             # Required for Stars: Turso auth token
DEBUG_API                    # Optional: Enable SBDB debug logging
TRUST_CLOUDFLARE_HEADERS     # Optional: "true" to trust CF-Connecting-IP for rate limiting
TRUST_FLY_HEADERS            # Optional: "true" to trust Fly-Client-IP for rate limiting
```

## Turso Database Setup (Stars Feature)

The Stars feature uses Turso (hosted SQLite) for fast browse/search. Setup steps:

### 1. Install Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
export PATH="$HOME/.turso:$PATH"  # Add to shell profile
```

### 2. Authenticate

```bash
turso auth login  # Opens browser for authentication
```

### 3. Create Database

```bash
turso db create cosmic-index
turso db show cosmic-index --url      # Get database URL
turso db tokens create cosmic-index   # Get auth token
```

### 4. Add Credentials to .env.local

```
TURSO_DATABASE_URL=libsql://cosmic-index-xxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

### 5. Run Schema

```bash
turso db shell cosmic-index < db/schema.sql
```

### 6. Run Ingestion

```bash
bun run ingest:stars           # Ingests ~4,500 host stars from NASA
bun run ingest:stars --reset   # Reset checkpoint for fresh start
```

The ingestion script (`scripts/ingest-stars.ts`):

- Fetches host star data from NASA Exoplanet Archive TAP API
- Uses keyset pagination with checkpointing for resumability
- Derives spectral class (O/B/A/F/G/K/M) from spectral type
- Batch upserts to Turso (2000 rows per batch)

### Verify

```bash
turso db shell cosmic-index "SELECT COUNT(*) FROM stars"
```

## UI Components

- Uses shadcn/ui components in `src/components/ui/`
- Retrofuturistic theme with scanlines, bezels, glow effects
- Client components marked with `"use client"` directive
- Debounced search (300ms) in search-bar.tsx
