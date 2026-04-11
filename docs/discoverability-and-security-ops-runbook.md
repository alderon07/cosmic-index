# Discoverability and Security Ops Runbook

Last updated: 2026-04-11

This runbook is a lightweight weekly checklist for keeping:
- search indexing healthy
- AI/search-bot discoverability intact
- edge and API abuse protections calibrated

It assumes the current setup:
- Google Search Console property is configured for `cosmicindex.dev`
- production sitemaps are submitted
- Vercel Bot Protection is on
- Vercel AI Bots blocking is off
- custom Vercel firewall rules are limited
- app-side API throttling and same-origin write protection are enabled

## 1) Weekly Search Console Checks

Open Google Search Console for the production property and review:

1. `Sitemaps`
   - Confirm submitted sitemaps still show success.
   - Re-check:
     - `https://cosmicindex.dev/sitemap.xml`
     - `https://cosmicindex.dev/sitemap-exoplanets`
     - `https://cosmicindex.dev/sitemap-stars`
     - `https://cosmicindex.dev/sitemap-small-bodies`

2. `Pages` / indexing
   - Watch for sudden growth in excluded, crawled-not-indexed, soft-404, or error buckets.
   - Investigate new crawl failures promptly.

3. `URL Inspection`
   - Inspect at least:
     - home page
     - one exoplanet detail page
     - one star detail page
     - one small-body detail page
     - one hub page such as `/space-weather`
   - Confirm the canonical is what you expect.
   - Confirm representative detail pages remain crawlable and index-eligible.

4. `Performance`
   - Look for impression growth over time, even if clicks are still modest.
   - Watch by page type rather than only sitewide.

## 2) Weekly Vercel Firewall Checks

Open `Firewall -> Traffic` and review:

1. Top request paths
   - Healthy pattern:
     - junk probe paths like `/wp-admin/*` remain noisy
     - legitimate crawl paths like `/robots.txt` and `/sitemap.xml` appear occasionally
   - Concerning pattern:
     - real app/API routes dominate challenged or denied traffic unexpectedly

2. Search for these important paths:
   - `/robots.txt`
   - `/sitemap.xml`
   - `/sitemap-exoplanets`
   - `/sitemap-stars`
   - `/sitemap-small-bodies`
   - `/api/v1/images/object`

3. Watch for repeat abusive IPs
   - If the same IP repeatedly hammers junk paths or expensive API routes, add it to `IP Blocking`.

4. Review the current custom rules
   - `Rate limit image search`
   - `Block common junk probes`

## 3) Weekly Vercel Log Checks

Check production logs for:

1. `429` responses
   - Some `429`s on `/api/v1/images/object` are expected if the edge rule is working.
   - If many legitimate requests are getting `429`, loosen the edge rule before changing app limits.

2. `5xx` or timeouts
   - Especially on:
     - `/api/v1/exoplanets/[id]`
     - `/api/v1/small-bodies/[id]`
     - `/api/v1/space-weather/[id]`
     - `/api/v1/stars/[id]/planets`
   - Spikes here may indicate upstream NASA/JPL/DONKI instability or abuse pressure.

3. Unexpected denials on real routes
   - If real user traffic is being denied at the edge, revisit firewall rules first.

## 4) Public Route Smoke Checks

At least once per week, manually verify:

- `https://cosmicindex.dev/robots.txt`
- `https://cosmicindex.dev/sitemap.xml`
- one representative public page
- one representative public API detail route

Expected outcome:
- public crawl/discovery routes load normally
- no security checkpoint on sitemap or robots routes
- no obvious stale or broken public responses

## 5) What Healthy Looks Like

- submitted sitemaps remain successful
- `robots.txt` and sitemap routes receive occasional crawl traffic
- junk WordPress-style probe paths are common, but real routes are not being blocked
- public browse/detail pages remain reachable
- no sustained increase in `5xx`
- no widespread legitimate `429`s

## 6) What Needs Action

Investigate promptly if you see any of the following:

- sitemap fetch failures in Search Console
- real pages dropping from index unexpectedly
- new structured-data critical errors
- real crawl/discovery routes being challenged or denied
- repeated abuse on expensive public endpoints from the same IP
- sustained spikes in `429` or `5xx`

## 7) Current Edge Rule Baseline

Current intended Vercel posture:

- `Bot Protection`: on
- `AI Bots`: off
- `Attack Mode`: off unless under active attack
- custom rule: rate limit `/api/v1/images/object`
- custom rule: deny common junk probes such as `/wp-admin*`, `/wordpress*`, `/xmlrpc.php`, and `/.env`

If more rule capacity becomes available later, the next candidates are:
- additional path-based rate limiting for upstream-heavy detail API routes
- explicit deny for `/wp-login.php`

## 8) Current App-Side Protection Baseline

Current intended app posture:

- same-origin protection for authenticated write routes under `/api/user/*` and `/api/stripe/*`
- public API rate limiting enabled
- tighter app-side throttles for:
  - image search
  - upstream-heavy detail routes

If abuse increases, prefer:
1. edge blocking/rate limiting when available
2. then app-side threshold tuning
3. then caching/fallback adjustments for upstream-heavy endpoints

