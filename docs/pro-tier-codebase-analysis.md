# Cosmic Index Project Structure - Pro Tier Implementation Analysis

This document provides a comprehensive analysis of the Cosmic Index codebase patterns for implementing Pro tier features.

---

## 1. Provider Wrapping Architecture

**Location:** `src/app/layout.tsx`

The root layout uses a single context provider pattern:

```tsx
<KeyboardShortcutsProvider>
  <Header />
  <Main />
  <Footer />
</KeyboardShortcutsProvider>
<Analytics />
```

**Key insights:**
- No existing authentication context or middleware
- KeyboardShortcutsProvider is "use client" and wraps entire tree
- Header/nav is INSIDE provider (has access to context)
- Simple, additive pattern: stack additional providers without nesting complexity
- For Pro tier: Add `<ClerkProvider>` as outermost wrapper

---

## 2. Context Provider Pattern

**Location:** `src/components/keyboard-shortcuts/keyboard-shortcuts-provider.tsx`

The project has established conventions for creating providers:

**Template structure:**
- Always marked with `"use client"` directive
- Creates context with nullable type (requires null-check in hook)
- Hook throws error if used outside provider
- Can render modal/dialog components before `{children}`
- Manages internal state with useState/useCallback
- Exposes typed interface through context

---

## 3. Database Patterns (Turso with SQLite)

**Location:** `src/lib/star-index.ts`

**Lazy singleton pattern for client initialization:**
```typescript
let client: Client | null = null;

function getClient(): Client | null {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    console.warn("Turso not configured");
    return null;
  }
  client = createClient({ url, authToken });
  return client;
}
```

**Query building pattern:**
- `buildWhereClause()` combines conditions + args separately
- Parameterized queries with `?` placeholders
- Separate count query for pagination total

---

## 4. API Route Patterns

**Location:** `src/app/api/stars/route.ts`

Every API route follows this structure:

1. **Rate Limiting** - checks limits before processing
2. **Parameter Validation** - Zod schema with `.safeParse()`
3. **Business Logic** - fetch/query data
4. **Response with Headers** - include cache + rate limit headers

**Rate limit config** (already defined):
- BROWSE: 100 req/min for listing
- DETAIL: 200 req/min for detail operations

---

## 5. Component Integration Point

**Location:** `src/components/object-card.tsx`

The ObjectCard component has perfect integration points for save button:

**Current footer structure (lines 502-533):**
```tsx
<div className="border-t border-border/50 px-6 pt-3 flex flex-wrap items-center gap-2">
  {/* Discovery year */}
  <p className="text-xs text-muted-foreground">
    Discovered <span className="font-mono">{object.discoveredYear}</span>
  </p>

  {/* Badges container - RIGHT SIDE */}
  <div className="flex items-center gap-1.5 shrink-0 ml-auto justify-end">
    {/* NEO badge */}
    {/* PHA badge */}
    {/* Type badge */}
  </div>
</div>
```

**Where to add save button:**
- Add as first item in badges container
- Use Heart icon (lucide-react already available)
- Toggle between filled/outline heart
- Color matches object type theme

**Component patterns already used:**
- Type guards: `isExoplanet()`, `isStar()`, `isSmallBody()`
- Theme colors: "primary", "uranium-green", "radium-teal", "secondary"
- Tooltip for hover text
- Modal mode check: `if (onModalOpen)` for behavior branching

---

## 6. Type System

**Location:** `src/lib/types.ts`

**All cosmic objects inherit from base:**
```typescript
export interface CosmicObject {
  id: string;                    // URL-safe slug (PRIMARY KEY for saving)
  type: ObjectType;              // EXOPLANET | SMALL_BODY | STAR
  displayName: string;
  aliases: string[];
  source: DataSource;
  sourceId: string;
  summary: string;
  keyFacts: KeyFact[];
  links: SourceLink[];
  discoveredYear?: number;
}
```

**Type guard functions already exist:**
```typescript
function isExoplanet(obj: AnyCosmicObject): obj is ExoplanetData { ... }
function isStar(obj: AnyCosmicObject): obj is StarData { ... }
function isSmallBody(obj: AnyCosmicObject): obj is SmallBodyData { ... }
```

---

## 7. Caching Patterns

**Location:** `src/lib/cache.ts`

Redis caching with graceful fallback:

**TTL Configuration:**
```typescript
export const CACHE_TTL = {
  EXOPLANETS_BROWSE: 12 * 60 * 60,
  SMALL_BODIES_DETAIL: 7 * 24 * 60 * 60,
  // ...
} as const;

export const CACHE_KEYS = {
  EXOPLANET_BROWSE: "exo:browse",
  // ...
} as const;
```

---

## 8. Page Architecture

**Location:** `src/app/exoplanets/page.tsx`

**URL-driven state pattern:**
- All filters/pagination in searchParams
- Memoized derived filters from URL
- updateUrl() helper to sync state
- Suspense boundary for SSR compatibility

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Layout structure, provider placement |
| `src/components/keyboard-shortcuts/keyboard-shortcuts-provider.tsx` | Provider template |
| `src/lib/star-index.ts` | Database patterns |
| `src/app/api/stars/route.ts` | API template |
| `src/components/object-card.tsx` | Component integration |
| `src/lib/types.ts` | Types |
| `db/schema.sql` | DB schema |

---

## 10. Environment Variables

Already configured:
```
TURSO_DATABASE_URL=libsql://cosmic-index-xxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

New variables needed for Pro tier:
```
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

## Summary

**Architecture is highly compatible with Pro tier features:**

1. **Provider**: Add `<ClerkProvider>` following existing provider pattern
2. **Database**: Add Pro tier tables following existing schema conventions
3. **API routes**: Create `/api/user/*` routes using existing patterns
4. **Components**: Add save button to ObjectCard following badge placement pattern
5. **State**: Use context hook from auth provider for subscription/saved state
6. **Caching**: Use existing Redis wrapper with appropriate TTLs
7. **Rate limiting**: Extend existing rate limit config for save/delete operations
8. **Types**: Extend types and add Pro tier interfaces

**No breaking changes needed** - all patterns are additive and follow established conventions.
