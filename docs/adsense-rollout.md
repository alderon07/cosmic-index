# Google AdSense rollout

Last updated: 2026-08-24

This runbook covers the external configuration and production verification for
the single manual responsive unit below the Cosmic Index footer. Code rollout
does not create an AdSense account, configure Google Privacy & messaging, deploy,
or mutate production data.

## Environment configuration

Configure these values in the deployment environment:

```text
GOOGLE_ADSENSE_ENABLED=false
GOOGLE_ADSENSE_CLIENT_ID=ca-pub-################
GOOGLE_ADSENSE_FOOTER_SLOT_ID=##########
```

The client ID must be `ca-pub-` plus exactly 16 digits. The footer slot ID must
be exactly 10 digits. Invalid values fail closed. A valid client ID publishes
ownership metadata and `/ads.txt` even while serving is disabled. Ad serving
requires all three values and `GOOGLE_ADSENSE_ENABLED=true`.

`STRIPE_PRO_PRICE_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and Clerk server
configuration must also remain available. Signed-in eligibility fails closed if
the configured Pro price or user database is unavailable.

## Console setup

1. Create or finish the AdSense account and add `cosmicindex.dev`.
2. Obtain the publisher ID and deploy it with `GOOGLE_ADSENSE_ENABLED=false`.
3. Confirm the root `google-adsense-account` metadata and verify
   `https://cosmicindex.dev/ads.txt` is authorized.
4. In Privacy & messaging, create and publish a European regulations message
   with **Consent**, **Do not consent**, and **Manage options**.
5. Publish a US state regulations message targeting all current and future
   supported states.
6. Enable Google's advertising and analytics consent-mode integration.
7. Register `https://cosmicindex.dev/privacy` as the privacy-policy URL.
8. Request site review and wait until the site status is **Ready**.
9. Create one responsive display unit named
   `Cosmic Index — Below Footer` and configure its slot ID.
10. Keep Auto ads disabled. Explicitly disable anchor, vignette, side-rail,
    intent-driven, Offerwall, ad-block recovery, mobile expansion, and
    additional-trigger formats.
11. Re-audit these dashboard settings after future AdSense changes because Auto
    ads can use ordinary publisher code already present on the site.
12. Enable `GOOGLE_ADSENSE_ENABLED` and redeploy only after the preceding checks
    pass.

The expected deployed referrer policy is `strict-origin-when-cross-origin` or a
compatible policy.

## Verification matrix

Use a clean browser profile and Google's documented `fc=alwaysshow` parameters
when testing privacy messages. Verify:

- Anonymous visitors receive one below-footer unit only on allowlisted content.
- Free signed-in users receive the unit only after the database check succeeds.
- Pro users and active or trialing configured-price subscribers receive no ad
  element and no `adsbygoogle.push` call.
- An anonymous ad disappears immediately when sign-in begins resolving.
- Declined-consent behavior follows the published Google message configuration.
- Mobile and desktop layouts remain non-sticky and do not obscure content.
- Privacy, FAQ, user, settings, waitlist, documentation, sitemap, 404, and error
  screens contain no ad unit.
- A direct `/privacy` document contains no AdSense, Google Analytics, or Vercel
  Analytics script.
- Missing configuration, a blocked publisher script, unfilled inventory, and a
  database outage do not produce application errors or stale ads.
- Eligible-to-eligible client navigation retains the current slot without an ad
  refresh; excluded-to-eligible navigation performs a fresh signed-in check.

Do not click live advertisements. Do not run automated production tests that
repeatedly request ad inventory; those actions can be classified as invalid
traffic.

## Rollback

Set `GOOGLE_ADSENSE_ENABLED=false` and redeploy. Retain the ownership metadata
and `/ads.txt` record unless the AdSense account is being retired. No database
rollback or cache purge is required because ad eligibility is not stored in
Upstash, Next.js caches, or persisted browser query storage.
