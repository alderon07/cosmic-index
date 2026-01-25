# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cosmic Index is a retrofuturistic web encyclopedia for exploring cosmic objects. It aggregates data from NASA's Exoplanet Archive (5,000+ exoplanets) and JPL's Small-Body Database (1,000,000+ asteroids/comets) into a unified browsing interface.

## Commands

```bash
bun run dev          # Start dev server with Turbopack (port 3000)
bun run build        # Production build
bun run lint         # Run ESLint
bun run sbdb:diag    # Run JPL SBDB API diagnostic script

# Integration tests (calls real external APIs)
RUN_INTEGRATION=1 pnpm test
```

## Architecture

### Data Flow

```
External APIs → API Clients (src/lib/) → API Routes (src/app/api/) → React Components
                     ↓
              Redis Cache (Upstash)
```

### Two Data Sources with Different Strategies

**NASA Exoplanet Archive** (`src/lib/nasa-exoplanet.ts`):
- Uses TAP API with ADQL queries
- Query building with SQL injection prevention via `escapeADQL()`
- Direct pagination with bounded offsets

**JPL Small-Body Database** (`src/lib/jpl-sbdb.ts`):
- Dual-strategy search with fallback:
  1. Primary: `sb-cdata` API with regex-based search (comprehensive)
  2. Fallback: Lookup API with `sstr` parameter (fast)
- Complex slug resolution for various designation formats (provisional, periodic comets, numbered asteroids)

### Unified Data Model

All cosmic objects implement `CosmicObject` base interface (`src/lib/types.ts`):
- `ExoplanetData` extends with: hostStar, discoveryMethod, orbitalPeriodDays, radiusEarth, massEarth
- `SmallBodyData` extends with: bodyKind, orbitClass, isNeo, isPha, diameterKm

### Caching & Rate Limiting

- Redis caching via Upstash with TTL (12h browse, 24h-7d detail)
- Sliding window rate limiter using Redis sorted sets
- Both gracefully degrade when Redis unavailable

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
UPSTASH_REDIS_REST_URL    # Optional: Redis cache
UPSTASH_REDIS_REST_TOKEN  # Optional: Redis cache
DEBUG_API                 # Optional: Enable SBDB debug logging
```

## UI Components

- Uses shadcn/ui components in `src/components/ui/`
- Retrofuturistic theme with scanlines, bezels, glow effects
- Client components marked with `"use client"` directive
- Debounced search (300ms) in search-bar.tsx
