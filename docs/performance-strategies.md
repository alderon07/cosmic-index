# Cosmic Index Performance Strategies

Updated (UTC): 2026-03-03

## Goal

Make user-facing data flows feel instant while staying within Turso/Vercel limits and keeping behavior predictable.

Prerequisite status: core DB migrations (`001`-`004`) are applied, so index/query tuning work can proceed without schema blockers.

## Implemented Now

### 1. React Query caching + optimistic updates + cross-page prefetch

- Status: Implemented
- Why: Removes avoidable refetch latency and makes mutations feel immediate.
- Where:
  - `src/app/user/saved-objects/saved-objects-page-content.tsx`
  - `src/app/user/collections/collections-page-content.tsx`
  - `src/app/user/collections/[id]/collection-detail-content.tsx`
  - `src/components/collections/add-to-collection-dialog.tsx`
  - `src/lib/query-keys.ts`
- Notes:
  - Uses stable query keys.
  - Uses optimistic updates with rollback on error.
  - Prefetches likely-next screens/data.

### 2. Query cache persistence (session storage)

- Status: Implemented
- Why: Survives reload/navigation and makes repeated visits fast.
- Where:
  - `src/components/providers/query-provider.tsx`
- Notes:
  - Persists successful `user/*` queries only.
  - Uses TTL and throttled writes to avoid storage churn.
  - Mutations are not persisted.

### 3. UI windowing/virtualization for long lists

- Status: Implemented
- Why: Reduces DOM size and render cost for large datasets.
- Where:
  - Saved objects grid: `src/app/user/saved-objects/saved-objects-page-content.tsx`
  - Collection membership dialog list: `src/components/collections/add-to-collection-dialog.tsx`
- Notes:
  - Uses viewport-based slicing with overscan and spacer rows.
  - Resets scroll position when filters/search change.

### 4. Request-level instrumentation (`Server-Timing`)

- Status: Implemented
- Why: Lets us identify slow segments quickly in browser devtools/network traces.
- Where:
  - `src/lib/server-timing.ts`
  - `src/app/api/user/saved-objects/route.ts` (GET)
  - `src/app/api/user/collections/route.ts` (GET)
  - `src/app/api/user/collections/[id]/route.ts` (GET)
  - `src/app/api/user/saved-objects/[id]/collections/route.ts` (GET)
- Notes:
  - Emits segment timings plus total request time.
  - Includes timing headers on auth errors too.

## Strategies To Implement Next (Prioritized)

### P0 (High Impact / Low-Medium Risk)

#### 1. Cursor-based pagination for large user datasets

- Why: Avoids expensive offset scans as tables grow.
- Scope:
  - Saved objects list endpoint and UI.
  - Collection detail endpoint and UI.
- Caveat:
  - Requires API contract updates and client pagination state changes.

#### 2. Conditional GET support (`ETag` / `If-None-Match`)

- Why: Reduces payload transfer and parsing cost when data is unchanged.
- Scope:
  - `GET /api/user/saved-objects`
  - `GET /api/user/collections`
  - `GET /api/user/collections/[id]`
- Caveat:
  - Must ensure ETag derivation is stable and user-scoped.

#### 3. Targeted DB index audit using real query patterns

- Why: Keeps tail latency down as usage increases.
- Scope:
  - Validate current index coverage for ordering/filter paths used in user routes.
  - Add missing composite indexes where query plans show table scans.
- Caveat:
  - Must validate write amplification vs. read wins.

### P1 (Medium Impact / Low Risk)

#### 4. Virtualize more high-cardinality pages

- Why: Same DOM/render gains as saved objects page.
- Scope:
  - Large catalog browse grids (where item count and card complexity are high).

#### 5. Progressive hydration for heavy interactive panels

- Why: Faster initial interactivity for page shell.
- Scope:
  - Defer non-critical dialogs/panels until user intent.

#### 6. Hover/focus intent prefetch

- Why: Makes navigation feel immediate without broad prefetching.
- Scope:
  - Prefetch detail data on card-link hover/focus for likely clicks.

### P2 (Bigger Changes)

#### 7. Async export jobs for large exports

- Why: Improves reliability and UX for very large datasets.
- Scope:
  - Queue + worker model with resumable download.
  - Polling or push status updates in UI.

#### 8. Field-level export profiles and selective projection

- Why: Smaller payloads for casual users; richer exports for researchers.
- Scope:
  - Profile-aware column sets with optional advanced fields.

## Measurement and Guardrails

### Core metrics to track

- P50/P95 for:
  - `GET /api/user/saved-objects`
  - `GET /api/user/collections`
  - `GET /api/user/collections/[id]`
- Client:
  - Time to first list render.
  - Interaction latency for save/remove/add-to-collection.
- Infra:
  - Turso reads/writes and storage growth.
  - Error rate and retry frequency.

### Regression checks

- Keep optimistic rollback paths tested.
- Verify persisted-cache hydration never leaks across users.
- Validate virtualization boundaries (first/last item visibility, keyboard access).

## Recommended Execution Order

1. Cursor pagination
2. Conditional GET + ETag
3. Index audit/tuning
4. Expand virtualization coverage
5. Intent prefetch + progressive hydration
6. Async export architecture
