# AdSense review investigation

Observed October 8, 2026 UTC (October 7 evening in North Carolina).
Repository inspected at `00db191`, before this branch's changes.
This investigation is independent of the ISR write investigation.

## What Google actually reported

The October 5 email, titled "You need to fix some issues before your site is
ready for AdSense", says the site is not ready and directs the publisher to
**Sites**. It does not name a violation, show a failed URL, or identify
low-value content. The current dashboard attempt reaches Google sign-in and
waits for passkey verification; no authenticated Sites or Policy center details
have been read. The exact rejection category remains unknown.

The earlier rollout document called this a low-value-content rejection without
establishing that diagnosis for this notification. This branch corrects that
claim. Google's [site-readiness guide](https://support.google.com/adsense/answer/12176698)
lists connection, accessibility, content/experience, and policy failures as
different possibilities. Only the account's review details can distinguish
the reported reason here.

## Verified current state

| Check | Evidence | Result |
| --- | --- | --- |
| Publisher ownership | Homepage HTML contains `google-adsense-account`; its value matches the publisher ID in the notification | Present |
| `/ads.txt` | Anonymous HTTPS GET returns 200, plain text, and the matching Google DIRECT seller record | Present via `src/app/ads.txt/route.ts`; a `public/ads.txt` file is unnecessary |
| Public access | Homepage, catalogs, guides, About, and Privacy return public content without an account | No login wall on sampled content |
| Domain handling | HTTP and `www` resolve to HTTPS at `cosmicindex.dev` | Working in the sampled requests |
| Crawler rules | Live `/robots.txt` allows public paths, blocks `/api/`, and separately blocks AhrefsBot | No robots exclusion for public AdSense review pages |
| Discoverability | Live sitemap includes all six guides, hubs, FAQ, and About; homepage and footer link to guides | Existing discovery paths work |
| Editorial content | Sampled TRAPPIST-1 and comparison guides contain original worked calculations, primary-source links, dated inputs, assumptions, and limitations | Concrete added value exists; approval is still Google's decision |
| Privacy and contact | Public Privacy explains advertising/analytics choices; About explains methods and public corrections | Present; CMP publication cannot be inferred from policy prose |
| Missing content | Unknown guide and nonexistent catalog record return 404 | No sampled generic soft-404 problem |
| Ad inventory | Code allows exactly six completed guides; homepage, catalog/detail pages, dashboards, About, and Privacy are excluded | Already restricted; no new ads added |
| APOD availability | `/api/v1/apod` returned 503 `UPSTREAM_UNAVAILABLE` in two separate requests; live homepage showed its section title without a card | Confirmed degraded user experience |
| Publisher script eligibility | `shouldLoadAdsenseScript` checked route/serving/marker but ignored authentication and database-backed eligibility | Confirmed code gap even though the manual ad unit had stronger checks |

These observations describe the current deployment, not the exact pages or
network responses Google's reviewer saw on October 5. Public HTTP checks do
not establish access through every hosting firewall rule or from Google's
crawler infrastructure. No production settings or data were changed.

## Changes in this branch

- Keep an APOD availability message and a link to NASA's APOD page visible on
  feed failure instead of leaving an empty heading. Successful feed rendering,
  credits, explanation, and dated source links remain intact. The API's 503
  cause still needs upstream/server-log diagnosis; this UI fix does not restore
  the feed or invent an image.
- Require resolved authentication and a successful free-user eligibility result
  before first loading publisher code. Anonymous visitors require resolved
  authentication but no database lookup. Pro, failed, pending, and refetching
  results fail closed. The manual unit still waits for publisher-script readiness.
- Correct the rollout's obsolete homepage inventory statement and unsupported
  rejection diagnosis.

No new dependency, schema change, API change, catalog noindex rule, sitemap
removal, rewrite, or cache/ISR change is included. The changes preserve the
existing editorial and catalog experience.

## Remaining evidence and account work

1. Complete Google sign-in, open **Sites → cosmicindex.dev**, and record the
   expanded review message, site status, verification method, and ads.txt
   status. Also inspect any relevant **Policy center** entries. Do not request
   another review until the actual listed issues have been addressed.
2. If ads.txt is still marked Not found or Unauthorized, compare the account
   snippet with the already-working live route and use **Check for updates**.
   Do not create a second conflicting file. Google's [ads.txt guide](https://support.google.com/adsense/answer/12171612)
   says ads.txt is recommended, not mandatory; its presence does not resolve a
   content-policy failure.
3. Confirm the chosen verification method is the meta tag or ads.txt if serving
   remains disabled. A publisher-script method cannot be inferred from either
   of those signals. Google's [site connection guide](https://support.google.com/adsense/answer/7584263)
   describes these alternatives.
4. Before serving ads, verify published **Privacy & messaging** configuration,
   the correct privacy-policy URL, and a certified CMP for relevant traffic.
   The site's optional analytics prompt does not substitute for advertising
   consent. Google's [CMP requirements](https://support.google.com/adsense/answer/13554116)
   require a certified CMP with TCF integration for personalized advertising in
   the EEA, UK, and Switzerland. This is an unverified readiness requirement,
   not an established reason for the October 5 rejection.
5. Keep Auto ads and the account-level intrusive formats listed in the rollout
   disabled. Previously loaded third-party code persists across client
   navigation/sign-in; the new initial-load guard cannot unload it. Keep
   serving disabled until the site is **Ready** and these checks pass.
6. Audit permission for automatically republished APOD images/videos before
   expanding monetization to the homepage. The card reproduces upstream media
   and explanation and shows a credit when provided, but the repository does
   not establish permission for each third-party work. NASA's [media usage
   guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
   distinguish NASA material from third-party copyrighted material. This is
   an unresolved rights check, not a finding that the owner lacks permission.

If the dashboard identifies low-value or replicated content, review the exact
examples it gives before changing catalog visibility or adding filler articles.
Google's [no/low-value publisher-content policy](https://support.google.com/publisherpolicies/answer/11112688)
and [replicated-content policy](https://support.google.com/publisherpolicies/answer/11190248)
focus on value added, curation, and commentary. There is no evidenced article
count or word-count threshold to target here. The six existing guides provide
a starting point for a human editorial review; they do not prove that Google
will approve the whole site.

## Validation

- Regression tests first reproduced the empty APOD output and publisher-code
  eligibility failures before implementation.
- 77 focused tests passed across APOD rendering, publisher services, ownership
  configuration, ads.txt responses, homepage, layout placement, and Privacy.
- A separate run of all eight ad-eligibility API tests passed, covering free/Pro
  decisions and unavailable configuration, database, and authentication.
- Repository-wide ESLint and the production Next.js build passed. The build
  used local fallback configuration without production credentials and logged
  degraded upstream DONKI feeds; it does not validate production integrations.
- Live anonymous checks covered ownership, robots, sitemaps, public content,
  redirects, missing routes, and the APOD failure. No live ads were clicked or
  repeatedly requested.

Deployment, authenticated dashboard verification, and a targeted response to
the reported rejection are still required before resubmission. This PR is not
a guarantee of approval.
