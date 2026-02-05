# Pro Tier Implementation - Remaining TODOs

## Environment Setup

- [ ] Add Clerk environment variables to `.env.local`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
  CLERK_SECRET_KEY=sk_...
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
  ```

- [ ] Add Stripe environment variables to `.env.local`:
  ```
  STRIPE_SECRET_KEY=sk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRO_PRICE_ID=price_...
  NEXT_PUBLIC_APP_URL=https://cosmicindex.com
  ```

## Database

- [ ] Run the Pro tier migration:
  ```bash
  turso db shell cosmic-index < db/migrations/001_pro_features.sql
  ```

- [ ] Verify tables were created:
  ```bash
  turso db shell cosmic-index "SELECT name FROM sqlite_master WHERE type='table'"
  ```

## UI Integration

- [ ] Integrate `SaveButton` into `ObjectCard` component (hover overlay in top-right)
- [ ] Add `SaveButton` to detail pages (exoplanet, star, small-body)
- [ ] Add `SaveButton` to event cards (fireballs, close approaches, space weather)
- [ ] Create saved objects list page (`/user/saved-objects`)
- [ ] Create collections management page (`/user/collections`)
- [ ] Create saved searches dropdown for filter panels
- [ ] Add export button to browse pages (exoplanets, stars)

## Stripe Setup

- [ ] Create Stripe product and price for Pro subscription
- [ ] Configure Stripe webhook endpoint in dashboard
- [ ] Set up Stripe Customer Portal branding
- [ ] Test checkout flow end-to-end
- [ ] Test subscription cancellation flow

## Alerts System

- [ ] Create alert configuration UI component
- [ ] Create Vercel Cron job for checking alerts (`/api/cron/check-alerts`)
- [ ] Set up email sending (Resend or SendGrid)
- [ ] Create email templates for different alert types
- [ ] Test alert trigger deduplication

## Testing & Verification

- [ ] Test auth flow: Sign up → Sign in → See UserButton
- [ ] Test save object: Click save → Verify no duplicates → See in saved list
- [ ] Test collections: Create → Add items → Verify ordering
- [ ] Test saved search: Save filters → Try duplicate (should update) → Load from dropdown
- [ ] Test export: Download 5000+ rows → Verify streaming works
- [ ] Test Stripe webhook idempotency: Replay event → Verify no duplicate processing
- [ ] Test tier downgrade: Cancel subscription → Verify features locked

## Polish

- [ ] Add loading states to all async operations
- [ ] Add error toasts for failed operations
- [ ] Add upgrade prompts when free users hit Pro features
- [ ] Add onboarding flow for new Pro subscribers
- [ ] Review and update keyboard shortcuts for new features
