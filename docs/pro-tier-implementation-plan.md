# Pro Tier Features Implementation Plan

## Overview

Implement Pro tier features for Cosmic Index: saved objects, collections, saved searches, alerts, and CSV/JSON exports. Uses Clerk for authentication and Stripe for billing.

**Key Design Decisions:**
- **DB is source of truth for tier** - Don't rely on JWT claims; always check user row
- **Canonical object IDs** - Format: `{type}:{slug}` (e.g., `exoplanet:kepler-442-b`)
- **Idempotent webhooks** - Store Stripe event IDs to prevent duplicate processing
- **Streaming exports** - Phase 1: stream with row limits; Phase 2: async jobs

---

## Phase 1: Authentication Foundation

### 1.1 Install Dependencies
```bash
bun add @clerk/nextjs stripe
```

### 1.2 Create Middleware
**File:** `src/middleware.ts`

**Middleware protects PAGES only, not API routes**

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Only page routes that require auth (not APIs!)
const isProtectedPage = createRouteMatcher([
  '/settings(.*)',
  '/user/(.*)',  // User dashboard pages
])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedPage(request)) {
    await auth.protect()  // Redirects to sign-in (good UX for pages)
  }
  // API routes: NO middleware protection
  // They use requireAuth() which returns 401 JSON
})
```

**Why split:**
- Pages: redirect to sign-in (good UX)
- APIs: return 401 JSON (API clients expect this, not HTML/302)
- All `/api/user/*` routes call `requireAuth()` themselves

### 1.3 Modify Root Layout
**File:** `src/app/layout.tsx`

- Wrap with `ClerkProvider` (outermost, around `KeyboardShortcutsProvider`)
- Add auth UI in header nav:
  ```tsx
  <SignedOut><SignInButton mode="modal" /></SignedOut>
  <SignedIn><UserButton /></SignedIn>
  ```

### 1.4 Create Auth Utilities
**File:** `src/lib/auth.ts`

**Critical: DB is source of truth for tier**

```typescript
export async function getAuthUser(): Promise<AuthUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  // Always check DB for tier - don't rely on JWT claims
  const db = getUserDb()
  const result = await db.execute({
    sql: 'SELECT tier FROM users WHERE id = ?',
    args: [userId]
  })

  const tier = result.rows[0]?.tier as string ?? 'free'

  return {
    userId,
    isPro: tier === 'pro'
  }
}

export async function requirePro(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) throw new AuthError('Unauthorized', 401)
  if (!user.isPro) throw new AuthError('Pro subscription required', 403, 'PRO_REQUIRED')
  return user
}
```

- Clerk public metadata is **optional convenience for UI** (fast client-side checks)
- All server-side auth decisions use DB lookup

### 1.5 User Sync Moments

**Problem:** Users can sign in and use free features before touching Stripe. Need to ensure user row exists in DB.

**Solution:** Conditional upsert (only write if missing or email changed)

```typescript
// In requireAuth() - called by all /api/user/* routes
export async function requireAuth(): Promise<AuthUser> {
  const { userId } = await auth()
  if (!userId) throw new AuthError('Unauthorized', 401)

  const db = getUserDb()

  // First: read (no write yet)
  const result = await db.execute({
    sql: 'SELECT tier, email FROM users WHERE id = ?',
    args: [userId]
  })

  const clerkUser = await currentUser()
  const currentEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? ''

  if (result.rows.length === 0) {
    // User doesn't exist - insert
    await db.execute({
      sql: 'INSERT INTO users (id, email) VALUES (?, ?)',
      args: [userId, currentEmail]
    })
    return { userId, email: currentEmail, isPro: false }
  }

  const row = result.rows[0]
  const dbEmail = row.email as string
  const tier = row.tier as string

  // Only update if email changed (rare)
  if (dbEmail !== currentEmail) {
    await db.execute({
      sql: 'UPDATE users SET email = ?, updated_at = datetime("now") WHERE id = ?',
      args: [currentEmail, userId]
    })
  }

  return {
    userId,
    email: currentEmail,
    isPro: tier === 'pro'
  }
}
```

**Write optimization:** Most requests = 1 read, 0 writes. Only writes on first visit or email change.

**Alternative:** Clerk webhook on `user.created` (more complex, requires webhook setup)

---

## Phase 2: Database Schema

### 2.1 Canonical Object ID Format

**Two strategies based on ID stability:**

#### Catalog Objects (stable IDs/slugs)
Direct format: `{type}:{slug}`

| Object Type | Format | Example |
|-------------|--------|---------|
| Exoplanet | `exoplanet:{slug}` | `exoplanet:kepler-442-b` |
| Star | `star:{slug}` | `star:kepler-442` |
| Small Body | `small-body:{slug}` | `small-body:433-eros` |

#### Event Streams (unstable coords/floats) → HASH-BASED
To avoid float formatting demons (35.2 vs 35.20, -118.5 vs -118.5000):

| Event Type | Canonical Payload | ID Format |
|------------|-------------------|-----------|
| Fireball | `{date}:{lat.toFixed(2)}:{lon.toFixed(2)}` | `fireball:{sha256(payload).slice(0,24)}` |
| Close Approach | `{des.toUpperCase()}:{jd.toFixed(1)}` | `close-approach:{sha256(payload).slice(0,24)}` |
| Space Weather | `{eventType}:{activityID}` | `{type}:{sha256(payload).slice(0,24)}` |

**Utility functions:**
```typescript
import { createHash } from 'crypto'

// For catalog objects with stable slugs
export function catalogObjectId(type: 'exoplanet' | 'star' | 'small-body', slug: string): string {
  return `${type}:${slug}`
}

// For event streams - hash the normalized payload
export function eventObjectId(
  type: 'fireball' | 'close-approach' | 'flr' | 'cme' | 'gst',
  payload: Record<string, string | number>
): string {
  // Normalize payload: sort keys, fixed decimals, uppercase strings
  const normalized = Object.entries(payload)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      if (typeof v === 'number') return `${k}:${v.toFixed(2)}`
      return `${k}:${String(v).toUpperCase().trim()}`
    })
    .join('|')

  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 24)
  return `${type}:${hash}`
}
```

**Benefits:**
- Same event always produces same ID regardless of float formatting
- Still human-debuggable (type prefix visible)
- 24 hex chars = 96 bits = effectively collision-free at any realistic scale

### 2.2 Create Migration
**File:** `db/migrations/001_pro_features.sql`

```sql
-- Users (synced from Clerk)
CREATE TABLE users (
  id TEXT PRIMARY KEY,                -- Clerk user ID
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- Saved Objects with STRICT uniqueness
CREATE TABLE saved_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_id TEXT NOT NULL,         -- e.g., 'exoplanet:kepler-442-b' or 'fireball:a1b2c3...'
  display_name TEXT NOT NULL,
  notes TEXT,
  -- For event-stream saves: store payload so we can display without refetching
  -- Catalog objects (exoplanet/star/small-body) leave this NULL
  event_payload TEXT,                 -- JSON: { date, lat, lon, energy, ... }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, canonical_id)       -- CRITICAL: prevents duplicate saves
);
CREATE INDEX idx_saved_objects_user_created ON saved_objects(user_id, created_at DESC);

-- Collections with user-scoped uniqueness
CREATE TABLE collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f97316',
  icon TEXT DEFAULT 'folder',
  is_public BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)               -- No duplicate collection names per user
);
CREATE INDEX idx_collections_user ON collections(user_id);

-- Collection Items with ordering
CREATE TABLE collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  saved_object_id INTEGER NOT NULL REFERENCES saved_objects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(collection_id, saved_object_id)
);
CREATE INDEX idx_collection_items_position ON collection_items(collection_id, position);

-- Saved Searches with canonicalized params hash
CREATE TABLE saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,             -- 'exoplanets' | 'stars' | 'small-bodies'
  query_params TEXT NOT NULL,         -- Canonicalized JSON (sorted keys, no defaults)
  params_hash TEXT NOT NULL,          -- SHA256 of canonicalized params
  result_count INTEGER,
  last_executed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, category, params_hash)  -- Prevents semantically identical searches
);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- Alerts with trigger tracking
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,           -- 'space_weather' | 'fireball' | 'close_approach'
  config TEXT NOT NULL,               -- JSON config
  enabled BOOLEAN NOT NULL DEFAULT 1,
  email_enabled BOOLEAN NOT NULL DEFAULT 1,
  last_checked_at TEXT,               -- For incremental event checking (write optimization)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_alerts_enabled ON alerts(enabled, alert_type);

-- Alert Triggers (dedupe table to prevent spam)
CREATE TABLE alert_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL,          -- e.g., 'FLR:2024-01-15T12:00:00'
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(alert_id, trigger_key)       -- CRITICAL: prevents duplicate notifications
);
CREATE INDEX idx_alert_triggers_alert ON alert_triggers(alert_id);

-- Stripe Events (idempotency table)
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,                -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Export History (minimal - avoid write bloat)
-- Only log exports, don't track every detail
CREATE TABLE export_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- No index needed - rarely queried, just for auditing
```

### 2.3 Saved Search Canonicalization
**File:** `src/lib/saved-searches.ts`

```typescript
import { createHash } from 'crypto'

// Remove defaults, sort keys, create stable JSON
export function canonicalizeParams(params: Record<string, unknown>): string {
  const DEFAULTS = { page: 1, limit: 24, order: 'asc' }

  const filtered = Object.entries(params)
    .filter(([k, v]) => v !== undefined && v !== null && v !== '' && v !== DEFAULTS[k])
    .sort(([a], [b]) => a.localeCompare(b))

  return JSON.stringify(Object.fromEntries(filtered))
}

export function paramsHash(canonical: string): string {
  // 32 hex chars = 128 bits = effectively collision-free
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32)
}
```

### 2.4 User DB Client
**File:** `src/lib/user-db.ts`

- Same pattern as `src/lib/star-index.ts` (lazy singleton)
- Uses same Turso database (shared connection)

---

## Phase 3: API Routes

### 3.1 Directory Structure
```
src/app/api/user/
├── saved-objects/
│   ├── route.ts           # GET (list), POST (save)
│   └── [id]/route.ts      # DELETE, PATCH
├── collections/
│   ├── route.ts           # GET, POST
│   └── [id]/
│       ├── route.ts       # GET, PATCH, DELETE
│       └── items/route.ts # POST, DELETE
├── saved-searches/
│   ├── route.ts           # GET, POST
│   └── [id]/route.ts      # PATCH, DELETE
├── alerts/
│   ├── route.ts           # GET, POST
│   └── [id]/route.ts      # PATCH, DELETE
└── export/route.ts        # POST (generate CSV/JSON)
```

### 3.2 API Patterns
- Use `requirePro()` from auth utilities
- Zod validation on request bodies (follow existing patterns in `src/lib/types.ts`)
- Return JSON with consistent error structure: `{ error: string, code?: string }`

### 3.3 Export API with Streaming
**File:** `src/app/api/user/export/route.ts`

**Phase 1: Streaming with row limits** (avoids Vercel timeouts)

```typescript
const MAX_EXPORT_ROWS = 5000

export async function POST(request: NextRequest) {
  const user = await requirePro()
  const { format, category, queryParams } = ExportSchema.parse(await request.json())

  const encoder = new TextEncoder()
  let finalRowCount = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (format === 'csv') {
          controller.enqueue(encoder.encode(getCSVHeader(category) + '\n'))
        } else {
          controller.enqueue(encoder.encode('[\n'))
        }

        // Stream rows in batches
        for await (const batch of fetchDataBatches(category, queryParams, 500)) {
          for (const row of batch) {
            if (finalRowCount >= MAX_EXPORT_ROWS) break

            const line = format === 'csv'
              ? toCSVRow(row) + '\n'
              : (finalRowCount > 0 ? ',' : '') + JSON.stringify(row) + '\n'

            controller.enqueue(encoder.encode(line))
            finalRowCount++
          }
          if (finalRowCount >= MAX_EXPORT_ROWS) break
        }

        if (format === 'json') {
          controller.enqueue(encoder.encode('\n]\n'))  // Valid JSON ending
        }

        // Log BEFORE closing (serverless may tear down after close)
        try {
          await logExport(user.userId, category, finalRowCount)
        } catch {
          // Best-effort log - don't block download on log failure
        }

      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="${category}-export.${format}"`,
    },
  })
}
```

**Phase 2 (future):** Async job → R2/S3 → signed download link

---

## Phase 4: UI Components

### 4.1 Auth Provider Context
**File:** `src/components/auth/auth-provider.tsx`

- Expose `{ isSignedIn, isPro, userId }` via React Context
- Wraps Clerk hooks for consistent access

### 4.2 Save Button
**File:** `src/components/save-button.tsx`

- Two variants: `icon` (for cards) and `button` (for detail pages)
- Shows tooltip: "Sign in to save" / "Pro feature" / "Saved"
- Optimistic updates with loading state

### 4.3 Integrate Save Button into ObjectCard
**File:** `src/components/object-card.tsx`

**Default variant:** Add save button next to navigation icon (top-right, visible on hover)
```tsx
{onModalOpen && (
  <div className="absolute top-3 right-3 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100">
    <SaveButton object={object} variant="icon" />
    <Link href={href} ... />
  </div>
)}
```

**Compact variant:** Add in badges area (block 3)

### 4.4 Collections Dialog
**File:** `src/components/collections/collections-dialog.tsx`

- List user's collections with checkmarks
- "New Collection" inline form
- Uses existing `Dialog` component from shadcn/ui

### 4.5 Saved Searches Dropdown
**File:** `src/components/saved-searches/saved-searches-dropdown.tsx`

- Select dropdown to load saved searches
- "Save Current Search" button
- Integrate into filter panels on browse pages

### 4.6 Export Button
**File:** `src/components/export-button.tsx`

- Format selector (CSV/JSON)
- Download trigger
- Shows "Pro" lock for free users

### 4.7 Pro Badge
**File:** `src/components/pro-badge.tsx`

- Uranium green styling: `border-uranium-green/50 text-uranium-green bg-uranium-green/10`

---

## Phase 5: Stripe Integration

### 5.1 Idempotent Webhook Handler
**File:** `src/app/api/webhooks/stripe/route.ts`

**Critical: Idempotent event processing**

```typescript
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  // 1. Verify signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = getUserDb()

  // 2. ATOMIC idempotency - insert-as-lock pattern
  // Insert first; if it fails (duplicate), we already processed this event
  try {
    await db.execute({
      sql: 'INSERT INTO stripe_events (id, event_type) VALUES (?, ?)',
      args: [event.id, event.type]
    })
  } catch (error) {
    // Constraint violation = duplicate event
    if (String(error).includes('UNIQUE constraint')) {
      return NextResponse.json({ received: true, skipped: 'duplicate' })
    }
    throw error  // Re-throw other errors
  }

  // 3. Process event AFTER successful insert (we own the lock)
  try {
    await processStripeEvent(event, db)
  } catch (error) {
    console.error('Stripe webhook error:', error)
    // Note: event is recorded but processing failed
    // Could add a "processed_at" column to track incomplete processing
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function processStripeEvent(event: Stripe.Event, db: Client) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const status = subscription.status

      // Tier based on subscription STATUS, not event type
      const tier = ['active', 'trialing'].includes(status) ? 'pro' : 'free'

      // Lookup user by customer ID first (more reliable than metadata)
      const userId = await resolveUserId(subscription.customer as string, subscription.metadata?.userId, db)
      if (!userId) {
        console.error('Could not resolve user for subscription:', subscription.id)
        return  // Don't throw - webhook should still return 200
      }

      await updateUserTier(userId, tier, subscription.id, db)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = await resolveUserId(subscription.customer as string, subscription.metadata?.userId, db)
      if (userId) {
        await updateUserTier(userId, 'free', null, db)
      }
      break
    }

    case 'checkout.session.completed': {
      // Link stripe_customer_id to user (for future lookups)
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.userId && session.customer) {
        await db.execute({
          sql: 'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
          args: [session.customer, session.metadata.userId]
        })
      }
      break
    }
  }
}

// Lookup chain: customer ID → metadata fallback
async function resolveUserId(customerId: string, metadataUserId: string | undefined, db: Client): Promise<string | null> {
  // Try customer ID first (more reliable)
  const byCustomer = await db.execute({
    sql: 'SELECT id FROM users WHERE stripe_customer_id = ?',
    args: [customerId]
  })
  if (byCustomer.rows.length > 0) {
    return byCustomer.rows[0].id as string
  }

  // Fallback to metadata
  return metadataUserId ?? null
}
```

### 5.2 Checkout Session API
**File:** `src/app/api/stripe/checkout/route.ts`

- Create Stripe checkout session with user metadata
- Store userId in subscription metadata for webhook lookups
- Return session URL for redirect

### 5.3 Billing Page
**File:** `src/app/settings/billing/page.tsx`

- Show current tier (from DB, not Clerk)
- Upgrade button (for free users)
- Manage subscription button (for Pro users, links to Stripe portal)

---

## Phase 6: Alerts System

### 6.1 Alert Configuration UI
**File:** `src/components/alerts/alert-config.tsx`

Alert types:
- **Space Weather:** Min Kp index, flare class threshold
- **Fireballs:** Energy threshold, geographic region
- **Close Approaches:** Distance threshold

### 6.2 Alert Trigger Keys (Deduplication)

**Critical: Prevent spam on job reruns**

**Trigger keys use the SAME canonical ID scheme as saved objects:**

```typescript
// Reuse eventObjectId() for trigger keys - one identity pipeline
function buildTriggerKey(alertType: string, event: Event): string {
  return eventObjectId(alertType, event)  // Same hash-based ID
}
```

| Alert Type | Trigger Key | Example |
|------------|-------------|---------|
| Solar Flare | `flr:{hash}` | `flr:a1b2c3d4e5f6...` |
| CME | `cme:{hash}` | `cme:a1b2c3d4e5f6...` |
| Geomagnetic Storm | `gst:{hash}` | `gst:a1b2c3d4e5f6...` |
| Fireball | `fireball:{hash}` | `fireball:a1b2c3d4e5f6...` |
| Close Approach | `close-approach:{hash}` | `close-approach:a1b2c3d4e5f6...` |

**One canonical identity pipeline** - no float formatting bugs in triggers either.

**Alert checking logic with write optimization:**
```typescript
async function checkAlert(alert: Alert) {
  const db = getUserDb()

  // Only fetch events AFTER last check (reduces reads + write attempts)
  const events = await fetchEventsSince(alert.alert_type, alert.last_checked_at)

  for (const event of events) {
    if (!matchesCriteria(event, alert.config)) continue

    const triggerKey = buildTriggerKey(alert.alert_type, event)

    // Check if already triggered
    const existing = await db.execute({
      sql: 'SELECT id FROM alert_triggers WHERE alert_id = ? AND trigger_key = ?',
      args: [alert.id, triggerKey]
    })

    if (existing.rows.length > 0) continue  // Already notified

    // Send notification
    await sendAlertEmail(alert, event)

    // Record trigger (INSERT OR IGNORE for extra safety)
    await db.execute({
      sql: 'INSERT OR IGNORE INTO alert_triggers (alert_id, trigger_key) VALUES (?, ?)',
      args: [alert.id, triggerKey]
    })
  }

  // Update last_checked_at (single write per alert per job run)
  await db.execute({
    sql: 'UPDATE alerts SET last_checked_at = datetime("now") WHERE id = ?',
    args: [alert.id]
  })
}
```

### 6.3 Alert Checking (Background Job)
**Options:**
- Vercel Cron (`/api/cron/check-alerts`) - runs every 15 min
- GitHub Actions on schedule

Check conditions against latest data, trigger email via Resend/SendGrid.

**Job is idempotent:** Can rerun safely due to trigger_key deduplication.

---

## Implementation Order

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1 | Auth Foundation | Clerk setup, middleware, auth UI in header |
| 2 | Database & Core API | Migration, saved objects API, SaveButton |
| 3 | Collections | Collections API, dialog, integration |
| 4 | Saved Searches | API, dropdown, filter panel integration |
| 5 | Exports | Export API with CSV/JSON generation |
| 6 | Stripe | Webhooks, checkout, billing page |
| 7 | Alerts | Config UI, background job, email notifications |
| 8 | Polish | Error handling, upgrade prompts, testing |

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `db/schema.sql` | Table structure patterns |
| `src/lib/star-index.ts` | Turso query patterns |
| `src/app/api/exoplanets/route.ts` | API route structure |
| `src/components/keyboard-shortcuts/keyboard-shortcuts-provider.tsx` | Context provider pattern |
| `src/components/object-card.tsx` | Save button integration points |
| `src/app/layout.tsx` | ClerkProvider placement |

---

## Environment Variables to Add

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# App URL (for Stripe redirects)
NEXT_PUBLIC_APP_URL=https://cosmicindex.com
```

---

## Turso Write Quota Considerations

Pro features add ongoing writes. Minimize where possible:

| Operation | Write Strategy |
|-----------|---------------|
| Save object | 1 INSERT (upsert on duplicate) |
| Create collection | 1 INSERT |
| Add to collection | 1 INSERT |
| Save search | 1 INSERT (upsert on hash duplicate) |
| Alert trigger | 1 INSERT per unique event |
| Export | 1 INSERT (minimal audit log) |
| Stripe webhook | 1-2 INSERTs (event + user update) |

**Avoided writes:**
- No "view" tracking
- No chatty audit logs
- Exports log only count, not full params
- Alert triggers use INSERT OR IGNORE

**Plan for growth:** If user volume grows, expect to move off Turso free tier (~$10/mo for Scaler).

---

## Verification

1. **Auth Flow:** Sign up → Sign in → See UserButton in header → Check `/api/user/me` returns correct tier
2. **Save Object:** Click save on card → Verify `UNIQUE(user_id, canonical_id)` prevents duplicates → See in `/user/saved-objects`
3. **Collections:** Create collection → Try duplicate name (should fail) → Add objects → Verify ordering works
4. **Saved Search:** Apply filters → Save → Try saving same filters again (should update existing via hash match) → Load from dropdown
5. **Export:** Export 5000+ rows → Verify streaming works without timeout → Verify CSV/JSON format
6. **Stripe:**
   - Checkout → Webhook fires → Verify `stripe_events` table has event ID
   - Cancel subscription → Verify tier downgrades
   - Replay webhook → Verify idempotency (no duplicate processing)
7. **Alerts:** Configure alert → Trigger manually → Receive email → Trigger same event again → Verify no duplicate email (trigger_key dedupe)
