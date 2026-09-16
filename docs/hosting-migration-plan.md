# Hosting migration plan

**Prepared:** September 16, 2026

**Last updated:** September 16, 2026

**Scope:** Move Cosmic Index away from Vercel without moving its managed data and third-party services at the same time.

## Recommendation

Use **Railway Hobby with one application instance, fronted by Cloudflare Free**, as the first migration target. Budget **$5 to $12 per month** for Railway at the current workload, then confirm the real amount during a 30-day parallel run. Keep Turso, Upstash, Clerk, Stripe, Sentry, Google Analytics, and AdSense where they are.

Use **DigitalOcean App Platform's fixed 1 GB plan at $10 per month** if predictable billing matters more than saving the last few dollars. It is the strongest fallback if Railway's measured memory use makes its bill exceed $10 per month.

Do not start with a VPS. A VPS can provide more resources per dollar, but it transfers operating-system patching, deployment safety, firewall maintenance, log rotation, monitoring, backups, and recovery to us. It becomes attractive after traffic or application memory makes a managed platform cost more than about $15 to $20 per month.

The planned architecture is:

```text
Visitors and crawlers
        |
        v
Cloudflare Free
DNS, TLS, CDN, DDoS protection, basic WAF
        |
        v
Railway Hobby, one US-region container
Next.js standalone server
        |
        +---------------- Turso: catalog and user data
        +---------------- Upstash: cache and rate limits
        +---------------- Clerk: authentication and user lifecycle
        +---------------- Stripe: checkout, portal, and webhooks
        +---------------- Sentry: errors, tracing, feedback, and uptime
        +---------------- NASA, NOAA, and JPL: upstream data

Browser-only services
Google Analytics and Google AdSense
```

This is a hosting migration, not a service rewrite. Keeping the managed services reduces risk and preserves the hobby-tier economics that already fit the site.

## Why a move is justified

The Vercel usage dashboard was checked on September 16, 2026 for the current 30-day window. The workload is close to two Hobby limits even though traffic and memory are low.

| Vercel resource | Current use | Hobby allowance | Used |
| --- | ---: | ---: | ---: |
| Fluid Active CPU | 3 hours 14 minutes | 4 hours | 81% |
| ISR writes | 147,914 | 200,000 | 74% |
| Fluid provisioned memory | 47.4 GB-hours | 360 GB-hours | 13% |
| Function invocations | 137,852 | 1,000,000 | 14% |
| Edge requests | 114,186 | 1,000,000 | 11% |
| Fast data transfer | 6.04 GB | 100 GB | 6% |
| Web Analytics events | 95 | 50,000 | less than 1% |
| Image transformations | 368 | 5,000 | 7% |

The pressure is active CPU and ISR generation. It is not bandwidth, request count, or provisioned memory. Vercel documents a [4 CPU-hour Hobby allowance](https://vercel.com/docs/functions/usage-and-pricing) and warns that Hobby features can stop working until usage falls back under a rolling limit. The [Hobby plan comparison](https://vercel.com/docs/plans/hobby) also lists 200,000 ISR writes and states that Hobby is for personal, non-commercial use. Because Cosmic Index is adding AdSense and paid subscriptions, remaining on Hobby is also a poor long-term policy fit even if the CPU problem is optimized.

Vercel Pro is a valid emergency bridge. It costs about $20 per member per month and includes 16 CPU-hours and 2 million ISR writes according to Vercel's [plan and pricing documentation](https://vercel.com/pricing). Current usage would fit. It buys time and preserves every Vercel feature, but it does not improve portability or give a predictable fixed-cost server.

## Hosting options

Prices below are monthly estimates before tax. Existing Turso, Upstash, Clerk, Stripe, Sentry, and Google costs are excluded because they do not change with the host. Estimates are based on the current 30-day workload and should be validated with a parallel deployment.

| Option | Expected app-host cost | Operations | Fit for Cosmic Index | Decision |
| --- | ---: | --- | --- | --- |
| Railway Hobby | $5 to $12 | Low | Good Next.js and Bun support, Git deploys, managed TLS, logs, metrics, and rollback | **First choice** |
| DigitalOcean App Platform, fixed 1 GB | $10 | Low | Predictable price and 100 GiB transfer; use a Dockerfile for Bun | **Best predictable fallback** |
| Google Cloud Run | $0 to $5 at current use | Medium | Current CPU, memory, and request totals appear to fit the free tier; cold starts and ephemeral Next.js cache add risk | Test later |
| Fly.io, shared CPU with 1 GB | About $6 to $9 plus storage and egress | Medium | Flexible containers and regions; more infrastructure choices and pricing pieces | Viable, not simplest |
| Hetzner CX23 VPS in the EU | $6.49 plus IPv4 and backups | High | 2 shared vCPU, 4 GB RAM, 40 GB NVMe, and 20 TB EU traffic; strong value but limited availability and longer US latency | Best value VPS when ready |
| DigitalOcean Droplet, 2 GB | $12 plus backups | High | US regions, simple pricing, persistent disk, and broad documentation | Safer US VPS choice |
| AWS Lightsail, 1 GB or 2 GB | $7 or $12 plus backups | High | Predictable bundle with large transfer allowance; still a self-managed server | Reasonable VPS alternative |
| Render paid web service, 512 MB | About $36 | Low | Good platform, but current entry paid compute is too expensive for this goal | Reject on price |
| Cloudflare Workers with vinext | Usage based | Medium to high | Promising edge deployment, but vinext is beta and image optimization is only partly supported | Revisit after maturity |
| Vercel Pro | About $20 | Very low | No migration, more headroom, best native Next.js behavior | Emergency bridge |

### Railway

Railway's [Hobby plan has a $5 minimum](https://docs.railway.com/pricing), and that $5 counts toward resource use. It charges $10 per GB-month of RAM, $20 per vCPU-month of CPU, $0.05 per GB of egress, and $0.15 per GB-month of volume storage. Billing is by the minute.

The current app should remain near the $5 minimum if its steady memory stays near 256 to 384 MB. A steady 1 GB process would move closer to $10 before CPU and egress. This is why the estimate is a range rather than a promise. Set a spend alert and inspect daily memory use during the first month.

Railway supports Bun and Docker, provides GitHub deployments, custom domains, logs, and metrics. Its [Next.js guide recommends standalone output](https://docs.railway.com/guides/fullstack-nextjs). Railway health checks protect a deployment cutover, but [Railway does not continue polling the health endpoint after deployment](https://docs.railway.com/deployments/healthchecks), so Sentry Uptime or another external monitor must remain active.

### DigitalOcean App Platform

DigitalOcean App Platform has a [fixed 1 shared vCPU and 1 GiB plan for $10 per month](https://docs.digitalocean.com/products/app-platform/details/pricing/) with 100 GiB of included transfer. The $5 plan has only 512 MiB. That may work, but it leaves little margin for Next.js, Sentry, image processing, and build-time spikes. Start at 1 GiB if this option is chosen.

The app only has `bun.lock`. DigitalOcean's Node buildpack documents npm, Yarn, and pnpm, but not Bun. Use the same multi-stage Dockerfile proposed for Railway instead of relying on buildpack package-manager detection. App Platform handles TLS, health-checked deploys, and platform maintenance.

### VPS options

A VPS gives the best fixed amount of CPU, memory, disk, and transfer per dollar. It also creates a single server that must be maintained.

Hetzner's September 2026 price table lists the EU CX23 at [$6.49 per month before IPv4](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/). Its [cost-optimized specification](https://www.hetzner.com/cloud/cost-optimized/) is 2 shared vCPU, 4 GB RAM, 40 GB NVMe, and at least 20 TB of EU traffic. Hetzner marks these cost-optimized machines as limited availability. Cosmic Index's audience and external data sources are largely US-oriented, so an EU origin will add latency on uncached dynamic requests.

DigitalOcean lists a [$6 1 GB Droplet and a $12 2 GB Droplet](https://www.digitalocean.com/pricing/droplets). The 1 GB server is possible only if the image is built in GitHub Actions and the host runs the finished image. The 2 GB server is a safer starting point. AWS Lightsail has similar [$7 1 GB and $12 2 GB Linux bundles](https://aws.amazon.com/lightsail/pricing/).

For one application, use Docker Compose and Caddy on a VPS. Do not install Kubernetes. Do not install Coolify on the smallest server because its control plane competes with the app for memory. Coolify becomes useful when one server hosts several applications or the server has at least 4 GB RAM.

### Cloud Run, Fly.io, Render, and Workers

Cloud Run deserves a later experiment. Request-based Cloud Run includes [180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests per month](https://cloud.google.com/run/pricing). The Vercel dashboard shows roughly 11,640 CPU-seconds, 170,640 GiB-seconds, and 138,000 function invocations, which appears to fit. This is only an approximation because the two platforms measure workloads differently. Cloud Run can scale to zero, but a cold container loses the runtime Next.js cache and can make first requests slow. A shared cache handler or a minimum instance would reduce that problem and add cost.

Fly.io lists a US shared CPU machine with 1 GB RAM at about [$5.92 per month](https://fly.io/docs/about/pricing/) before root filesystem, volume, and network costs. It offers more control over regions and machine lifecycle than Railway, with more configuration to own.

Render's paid 512 MB service is [$0.05 per hour](https://render.com/pricing), or about $36 for an always-on month. Its free service is unsuitable because it [sleeps after 15 minutes and can return a disallow-all `robots.txt` while asleep](https://render.com/docs/free). Either behavior is unacceptable for a crawler-dependent, AdSense-reviewed site.

Cloudflare now recommends vinext for Next.js 16 on Workers. Its own [Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) says vinext is beta and image optimization is only partly supported. Cosmic Index uses Next.js rewrites, proxy behavior, server routes, Clerk, Stripe, Sentry, remote images, and ISR. Treat Workers as a separate runtime migration after the normal Node container is stable.

## What changes in the application

The application already has good portability. It uses standard Next.js route handlers and remote HTTP services. Four Vercel-specific areas need work.

### Container and runtime

Add `output: "standalone"` to `next.config.ts` and use a multi-stage Dockerfile:

1. Install dependencies and build with Bun.
2. Upload production source maps to Sentry during the build, then copy only the standalone server, static assets, and public files into a small Node runtime image.
3. Run as a non-root user.
4. Bind to `0.0.0.0` and the platform-provided `PORT`.
5. Set a read-only root filesystem where the platform allows it, except for the Next.js cache directory if local ISR persistence is used.

Build the image once and promote the same image digest between staging and production. Do not rebuild separately during promotion because Next.js creates a build identifier and Server Action encryption material during the build.

### Next.js cache and ISR

Vercel currently owns the distributed ISR store. Self-hosted Next.js uses a local filesystem and memory cache by default. The [Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) says this works automatically for one server with persistent local disk. Multiple instances have separate caches unless a custom cache handler and tag coordination are added.

For the first migration:

- Run exactly one application instance.
- Let Cloudflare cache immutable `/_next/static/*` assets.
- Respect Next.js `Cache-Control` headers for fully static public pages.
- Do not apply a blanket "cache everything" rule to HTML or API responses.
- Do not cache authenticated routes, Stripe and Clerk webhooks, `/api/user/*`, or responses containing cookies.
- Expect the local runtime cache to reset on PaaS redeploys and container replacement.
- Warm the homepage, guide pages, `ads.txt`, `robots.txt`, sitemap indexes, and the most visited detail pages after each deploy.

The catalog detail pages currently use ISR for 7, 14, or 30 days. A PaaS container's ephemeral disk can cause more regeneration than a VPS with persistent disk. If regeneration becomes expensive, add an Upstash-backed Next.js cache handler or move catalog pages toward build-time/static data. Do not run a second replica until cache behavior is verified. If multiple replicas are later required, set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, use a consistent deployment ID, and coordinate cache invalidation as described in the Next.js self-hosting guide.

### Image optimization

`next/image` works on a self-hosted Node server, but image transformations consume origin CPU. Vercel currently performs this as a separate managed service, and the app uses several NASA, NOAA, JPL, YouTube, and Vimeo image hosts.

Keep Next.js image optimization during the first migration and measure:

- CPU time spent in image transformation.
- Cache hit ratio for `/_next/image`.
- Memory peaks when large upstream images are decoded.
- Whether Cloudflare caches transformed responses with their existing headers.

If it becomes a hotspot, use Cloudflare Images, pre-generate a small set of sizes, or serve trusted upstream images directly on pages where transformation adds little value. Do not disable all optimization without measuring Core Web Vitals and transfer size.

### Vercel-specific code and automation

The repository contains these direct dependencies:

| Current dependency | Migration change |
| --- | --- |
| `@vercel/analytics` in `GooglePublisherServices` | Remove it and update the analytics consent copy. Keep GA4 and Sentry. |
| `VERCEL_GIT_COMMIT_SHA` Sentry release fallback | Set `SENTRY_RELEASE` and `NEXT_PUBLIC_SENTRY_RELEASE` to the Git commit SHA during the image build. |
| `VERCEL_ENV` Sentry environment fallback | Set `SENTRY_ENVIRONMENT=production` and `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`. |
| `x-vercel-protection-bypass` in the Observatory GitHub workflow | Remove the header and `VERCEL_AUTOMATION_BYPASS_SECRET`; retain the bearer secret. |
| `maxDuration = 60` on the Observatory evaluator | It becomes informational outside Vercel. Keep the GitHub request timeout and bounded batch design. |
| Vercel preview deployments | Replace with a long-lived staging environment or temporary Railway environments only when needed. |

The request-rate limiter already has explicit support for `CF-Connecting-IP` and `Fly-Client-IP`. With Cloudflare proxying enabled, set `TRUST_CLOUDFLARE_HEADERS=true`. Do not enable `TRUST_PROXY_HEADERS` until the chosen platform's forwarded-header behavior is tested. Generic forwarded headers are spoofable when the origin can be reached directly.

## Service-by-service configuration

Keeping `https://cosmicindex.dev` as the public URL means most vendor configuration does not change. The origin changes; the product domain does not.

### Stripe

Keep:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL=https://cosmicindex.dev`

The webhook can stay at `https://cosmicindex.dev/api/webhooks/stripe`. Stripe recommends verifying every webhook signature and returning a successful response quickly in its [webhook documentation](https://docs.stripe.com/webhooks). The existing route verifies the raw body and records event IDs for duplicate suppression, which is suitable for a DNS cutover.

Cutover checks:

1. Exempt `/api/webhooks/stripe` from Cloudflare browser challenges and caching.
2. Send a Stripe test event to staging before production cutover.
3. Confirm the production signing secret is present only at runtime.
4. Confirm checkout and portal return URLs use `cosmicindex.dev`.
5. During the first hour after cutover, watch Stripe delivery attempts and Sentry.
6. Do not configure both the old and new origins as production webhook endpoints. Use the stable public domain so DNS selects one active origin.

If the endpoint is recreated instead of retained, copy the new signing secret to the host before enabling delivery.

### Clerk

Keep:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`

Clerk production keys are associated with the application's production domain. Because the domain remains `cosmicindex.dev`, a host migration does not require a Clerk domain migration. Keep `/api/webhooks/clerk` public, uncached, and exempt from browser challenges. Clerk's [webhook debugging guide](https://clerk.com/docs/guides/development/webhooks/debugging) recommends verifying the exact endpoint URL and delivery attempt details.

Test sign-in, sign-out, session refresh, protected API access, and a `user.deleted` test webhook. The publishable key is a build-time public value. The secret and webhook signing key must only be available at runtime.

### Turso

Keep:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Turso is accessed over its libSQL client and is not tied to Vercel. No database migration is needed. Choose the application region closest to Turso's primary region and the largest user group. Measure p50 and p95 query latency from the candidate host before cutover.

The current Turso free plan advertises [5 GB storage, 500 million rows read, 10 million rows written, and one day of point-in-time restore](https://turso.tech/pricing). Confirm the actual account plan and current usage separately. User accounts, subscriptions, saved objects, and webhook idempotency markers make Turso the most important recovery dependency. Document and test restore procedures before a host change.

### Upstash

Keep:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Upstash is a public REST service and works from any host. It stores application cache and rate-limit state. Select an app region close to the Upstash primary. Its current free plan includes [256 MB, 10 GB monthly bandwidth, and 500,000 commands](https://upstash.com/pricing/redis). Pay-as-you-go is $0.20 per 100,000 commands and supports a budget cap.

Do not replace Upstash with Redis on the first VPS. A local Redis instance would save little, consume server memory, and make rate limiting and cache state depend on the same single server as the app. Reconsider only when command volume makes Upstash materially expensive.

### Sentry

Keep:

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` during the build for source-map upload

Add explicit values:

- `SENTRY_ENVIRONMENT=production`
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`
- `SENTRY_RELEASE=<full Git commit SHA>`
- `NEXT_PUBLIC_SENTRY_RELEASE=<same Git commit SHA>`

The Sentry server config currently falls back to `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA`. Explicit values make releases provider-independent. Store the Sentry auth token as a build secret and avoid copying it into the final image. Sentry CLI supports environment-based authentication and release configuration as described in its [configuration guide](https://cli.sentry.dev/configuration/).

Retain Sentry error monitoring, traces, user feedback, and uptime monitoring. Review the 10% production trace sample and 10% session replay sample after migration because those settings affect Sentry volume independently of the host.

### Google Analytics

Keep `GOOGLE_ANALYTICS_ID` and the existing consent flow. GA4 runs in the browser and uses the same site domain, so no property change is required. Verify real-time page views and guide-engagement events after cutover. Google documents the existing `gtag('config', ...)` pattern in its [tag configuration guide](https://developers.google.com/tag-platform/gtagjs/configure).

Remove Vercel Analytics after GA4 is verified. Update the consent text so it no longer promises or describes Vercel Analytics. This loses Vercel's dashboard analytics, but GA4 remains the product analytics source and Sentry remains the application-performance source.

### Google AdSense

Keep:

- `GOOGLE_ADSENSE_ENABLED=true`
- `GOOGLE_ADSENSE_CLIENT_ID`
- `GOOGLE_ADSENSE_FOOTER_SLOT_ID`

The site and publisher ID stay the same. AdSense does not care which host serves the domain. It does care that the site, crawler-facing pages, and root `ads.txt` remain reachable. Google's [ads.txt guide](https://support.google.com/adsense/answer/12171612) requires the file at the root domain. The existing Next.js route produces `/ads.txt` from the publisher ID.

The repository also has `src/app/robots.ts`. It allows public pages and blocks `/api/`, while advertising the main and catalog sitemaps. Preserve that generated response during the migration.

Required checks:

- `GET https://cosmicindex.dev/ads.txt` returns `200`, `text/plain`, and the expected publisher line.
- `GET https://cosmicindex.dev/robots.txt` returns `200` and does not block Google crawlers.
- Neither path redirects through authentication or a challenge page.
- Cloudflare does not cache a temporary error response.
- The AdSense script remains in the approved pages after consent logic runs.
- The canonical domain and sitemap URLs remain unchanged.

Google's [site connection guide](https://support.google.com/adsense/answer/7584263) explains that crawler access and a valid site connection are required. Add an uptime check for both `/ads.txt` and `/robots.txt` during and after cutover.

### NASA, NOAA, JPL, and scheduled jobs

Keep `NASA_API_KEY`. Turso ingestion already runs in GitHub Actions and is host-independent.

The Observatory evaluator also runs from GitHub Actions, but its request currently includes a Vercel protection bypass header. Remove that header and secret. Keep:

- `OBSERVATORY_EVALUATOR_URL=https://cosmicindex.dev`
- `OBSERVATORY_CRON_SECRET`
- the `Authorization: Bearer` header
- the existing bounded batches, retry count, and maximum request time

Cloudflare must allow this endpoint without an interactive challenge. The application bearer secret remains the authorization boundary. If the evaluator becomes CPU-heavy, move it into a separate scheduled worker later so a long batch cannot compete with page traffic.

## Environment-variable inventory

The following production variables need to be copied without exposing their values. `NEXT_PUBLIC_*` values are embedded into browser bundles and must be present during the build. Sentry's auth token is build-only. Secrets should be runtime-only whenever the build does not need them.

| Group | Variables |
| --- | --- |
| Public build values | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PRO_BILLING_ENABLED`, `NEXT_PUBLIC_PRO_SURFACES_ENABLED`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE` |
| App behavior | `PRO_PRODUCT_ENABLED`, `PRO_BILLING_ENABLED`, `PRO_SURFACES_ENABLED`, `LIMIT_MODE`, `LIMIT_MODE_FORCE_ENFORCE`, `FORCE_ENFORCE_LIMIT_MODE`, `INTERNAL_ADMIN_IDS`, `PRO_ROLLOUT_ADMIN_IDS`, `COMPARE_DOMAINS` |
| Database and cache | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Authentication | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` |
| Billing | `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` |
| Google | `GOOGLE_ANALYTICS_ID`, `GOOGLE_ADSENSE_ENABLED`, `GOOGLE_ADSENSE_CLIENT_ID`, `GOOGLE_ADSENSE_FOOTER_SLOT_ID` |
| External data | `NASA_API_KEY` |
| Sentry build | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE` |
| Sentry runtime | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` |
| Internal automation | `OBSERVATORY_CRON_SECRET` |
| Proxy trust | `TRUST_CLOUDFLARE_HEADERS=true`; leave `TRUST_PROXY_HEADERS` and `TRUST_FLY_HEADERS` false unless required and tested |
| Runtime | `NODE_ENV=production`, `PORT` from platform, `HOSTNAME=0.0.0.0`, `NEXT_TELEMETRY_DISABLED=1` |

Store variables in the platform's secret manager. On a VPS, use a root-owned environment file with mode `0600`, or encrypted configuration such as SOPS. Never copy a Vercel environment export into the repository.

## DNS and TLS plan

Public DNS checks on September 16, 2026 show that `cosmicindex.dev` uses `ns1.vercel-dns.com` and `ns2.vercel-dns.com` as authoritative nameservers. The apex and `www` records currently resolve to Vercel addresses. CAA records allow Let's Encrypt, Sectigo, and Google Trust Services.

Move DNS authority to Cloudflare before moving the application, with the records still pointing at Vercel. This separates two risky changes and makes rollback clearer.

### DNS migration

1. Export or manually inventory every Vercel DNS record, including apex, `www`, CAA, MX, SPF, DKIM, DMARC, Clerk records, Search Console verification, and any other TXT or CNAME verification records.
2. Add `cosmicindex.dev` to Cloudflare Free and import the records.
3. Compare the imported zone line by line. Cloudflare warns that its quick scan [does not guarantee discovery of every record](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
4. Keep the web records DNS-only while they still point to Vercel.
5. If DNSSEC is enabled at the registrar, disable it before changing nameservers. Cloudflare explicitly warns that changing nameservers with old DNSSEC material can make a domain unreachable.
6. Change the registrar's nameservers from Vercel to the assigned Cloudflare nameservers.
7. Verify the zone from several resolvers, then re-enable DNSSEC through Cloudflare.
8. Wait at least 24 hours before changing the origin.

### Origin cutover

1. Add the Railway or DigitalOcean custom-domain target to Cloudflare.
2. Verify the platform certificate while the record is DNS-only if required.
3. Set Cloudflare SSL/TLS to [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
4. Change the apex and `www` targets to the new host.
5. Enable the Cloudflare proxy for web records after the origin certificate is valid.
6. Redirect exactly one of apex or `www` to the canonical host. The current canonical host should remain the apex.
7. Keep Vercel deployed and ready for at least 72 hours. Roll back by restoring the previous origin targets.

Do not expose a permanent unprotected `origin.cosmicindex.dev` unless it is access-controlled. A public origin hostname lets attackers bypass Cloudflare rate limits and WAF rules.

## Firewall and abuse protection

Cloudflare becomes the network edge. Proxied DNS sends web traffic through its CDN, DDoS protection, and security layer. Cloudflare describes this behavior in its [DNS proxy documentation](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/#proxy-status).

Start with conservative rules:

- Block requests for known secret and framework-exploit paths such as `/.env`, `/.git/*`, `/wp-admin/*`, and `/xmlrpc.php`.
- Preserve the application's Upstash rate limits for API, detail, image, sitemap, mutation, and global traffic.
- Do not challenge Stripe or Clerk webhooks.
- Do not challenge `/ads.txt`, `/robots.txt`, sitemaps, `/.well-known/*`, or public API clients.
- Do not cache authenticated responses, webhook responses, or user APIs.
- Allow verified search and advertising crawlers. Do not trust a User-Agent string alone as proof of crawler identity.
- Enable `TRUST_CLOUDFLARE_HEADERS=true` only when the origin is actually behind Cloudflare.

Cloudflare's default cache behavior focuses on static file extensions and does not automatically cache normal HTML or JSON in the same way as immutable assets. Review its [default cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) before adding cache rules.

For a VPS, add a provider firewall and host firewall:

- SSH keys only; disable password authentication and direct root login.
- Allow SSH only from a fixed admin IP, Tailscale, or another private access path.
- Allow ports 80 and 443 only as needed. Prefer restricting them to Cloudflare's published IP ranges once certificate renewal and health checks are accounted for.
- Apply unattended security updates and schedule controlled reboots.
- Run the application as a non-root container user.
- Keep Docker's socket and control ports private.

Managed PaaS avoids most of this server maintenance, which is the main reason to prefer it for the first move.

## Logs, metrics, alerts, and recovery

### Logs

Write application logs to stdout and stderr. Include request or correlation IDs, route, status, duration, release SHA, and error class. Never log cookies, authorization headers, webhook signatures, database tokens, or full user data.

Use:

- Railway or App Platform logs for deployment and recent runtime diagnosis.
- Sentry for exceptions, traces, releases, and user-submitted bug reports.
- Cloudflare analytics and security events for edge traffic and blocked requests.
- Stripe and Clerk delivery dashboards for webhook failures.
- GitHub Actions logs for ingestion and Observatory evaluator jobs.

On a VPS, configure journald size and retention limits or Docker log rotation. A default unlimited JSON log file can fill the server disk. Do not add a paid log vendor until platform logs and Sentry prove insufficient.

### Metrics and alerts

Create alerts for:

- Host spend at 50%, 80%, and 100% of a $12 initial monthly budget.
- Memory over 75% for 15 minutes.
- CPU over 80% for 15 minutes.
- Disk over 70% on a VPS.
- Error rate above 2% for five minutes.
- p95 dynamic response time above two seconds.
- Any failure of homepage, `/ads.txt`, `/robots.txt`, Stripe webhook test, or Clerk sign-in checks.
- Turso and Upstash nearing their plan limits.

Railway's health check only gates deployments, so retain Sentry Uptime for continuous external monitoring.

### Backups and disaster recovery

The application server should remain disposable. Do not store user uploads or canonical data on its local disk. Recovery should consist of provisioning a clean host, loading secrets, and deploying a known image digest.

Back up and test:

- Turso recovery and point-in-time restore.
- A secure copy of production secrets outside the host.
- Cloudflare DNS export.
- Container and infrastructure configuration in Git.
- The previous production image digest and release SHA.
- A written restore drill with a target recovery time of one hour.

Upstash data is cache and rate-limit state. Losing it should degrade caching and reset limit windows, not lose user records. Verify that this remains true before relying on it as a recovery assumption.

## What is lost by leaving Vercel

- Vercel's globally distributed static and ISR cache.
- Native Next.js ISR persistence and invalidation.
- Managed image transformation and its separate quotas.
- Automatic serverless scaling and request isolation.
- Next.js-aware preview deployments for every pull request.
- Vercel Web Analytics, deployment insights, and function usage views.
- Vercel's firewall, bot controls, deployment protection, and bypass tokens.
- Zero-configuration domains, certificates, and instant platform rollback.
- Tight Sentry release integration through Vercel environment variables.
- Less operational work during traffic spikes and host incidents.

Railway and DigitalOcean retain Git deployment, managed TLS, logs, health-checked releases, and rollback, so the practical loss is smaller than it would be on a VPS. Cloudflare replaces much of the CDN, DDoS, DNS, and WAF layer, but it does not reproduce Vercel's Next.js cache semantics.

## What is gained

- No 4-hour Hobby CPU ceiling that can pause the site.
- A hosting arrangement suitable for a monetized project.
- More predictable compute on App Platform or a VPS.
- Standard Docker deployment that can move between hosts.
- Long-lived processes, longer requests, and future background workers.
- Better control over CPU, memory, regions, logs, and rollout timing.
- Persistent local cache on a VPS.
- The option to run WebSockets or other non-serverless workloads later.
- Cloudflare-controlled DNS, edge security, and origin portability.
- Lower cost than Vercel Pro if the current workload stays small.

The main trade is clear: Vercel converts operations into platform limits and fees. A VPS converts fees into maintenance. Railway or App Platform sits between them and is the right first step.

## Migration sequence

### Phase 0: Establish a baseline

1. Save the current 30-day Vercel usage numbers in this document or an operations log.
2. Record p50 and p95 response times for the homepage, one guide, one catalog detail page, one dynamic space-weather route, and one authenticated API request.
3. Record the deployed container's expected memory with a local production build.
4. Export the complete DNS zone.
5. Confirm Turso and Upstash regions, usage, and recovery options.

### Phase 1: Make the repository portable

1. Add Next.js standalone output.
2. Add a multi-stage, non-root Dockerfile and `.dockerignore`.
3. Add a shallow `/api/healthz` endpoint that checks process readiness without calling every external service.
4. Add a separate authenticated or private deep diagnostic for Turso and Upstash if needed. Do not make every platform health check consume third-party requests.
5. Replace Vercel Sentry fallbacks with explicit release and environment values.
6. Remove Vercel Analytics and update consent text and tests.
7. Remove the Vercel protection-bypass header and secret from the Observatory workflow.
8. Add container build, focused tests, lint, and production-build checks to CI.
9. Document local container start and rollback commands.

### Phase 2: Deploy a parallel staging host

1. Create Railway Hobby in a US region near the Turso and Upstash primaries.
2. Deploy one instance from the container.
3. Load staging or test-mode credentials. Do not send production Stripe or Clerk webhooks to the provider hostname.
4. Run smoke tests through the provider domain.
5. Check memory at idle and under a representative crawl of catalog pages.
6. Run the Observatory evaluator manually against staging with a staging secret.
7. Verify image optimization and cache headers.

### Phase 3: Move DNS authority

Move authoritative DNS from Vercel DNS to Cloudflare while application records still target Vercel. Verify all records and re-enable DNSSEC. Wait at least one day before the origin cutover.

### Phase 4: Production cutover

1. Load production secrets into the new host.
2. Deploy the exact tested image digest.
3. Verify the health endpoint directly.
4. Change Cloudflare web records to the new origin and enable proxying with Full (strict) TLS.
5. Purge only relevant Cloudflare cache entries.
6. Warm important public pages.
7. Test anonymous browsing, Clerk sign-in, saved objects, Stripe checkout in the appropriate mode, APIs, search, images, Sentry, GA4, AdSense, `ads.txt`, `robots.txt`, sitemaps, and scheduled jobs.
8. Watch errors, latency, webhooks, memory, and cost continuously for the first hour and daily for a week.

### Phase 5: Observe and decommission

1. Keep the Vercel project deployed for 72 hours as a rollback target.
2. Keep DNS rollback values recorded.
3. After seven stable days, remove Vercel-specific secrets and integrations.
4. After 30 days, compare the real Railway bill with the $10 DigitalOcean alternative.
5. Move to DigitalOcean App Platform if Railway costs more than $10 without a clear performance benefit.
6. Consider a VPS only if managed hosting exceeds $15 to $20 per month for three consecutive months or a feature requires server control.

## Rollback plan

Rollback must not require a new build.

1. Keep the last Vercel deployment and its environment configuration active.
2. If the new origin has elevated errors, failed authentication, failed webhooks, or serious latency for more than 10 minutes, restore Cloudflare's apex and `www` records to the recorded Vercel targets.
3. Disable any Cloudflare cache rule created specifically for the new host.
4. Purge affected cached HTML and API responses.
5. Confirm Stripe and Clerk delivery to the stable public domain after DNS convergence.
6. Preserve the failing container logs and Sentry release for diagnosis.

Turso and Upstash remain shared during rollback, so user data does not need to be copied. The existing Stripe duplicate suppression also reduces replay risk. Avoid schema changes during the hosting cutover so both origins can run the same application version.

## Acceptance criteria

The migration is complete when all of these hold for seven days:

- Homepage and core public pages meet or beat the pre-migration p95 response time after cache warm-up.
- Error rate is below 1% and no new high-severity Sentry regression remains open.
- Clerk sign-in, sign-out, protected routes, and deletion webhook work.
- Stripe checkout, portal, webhook signature verification, and duplicate handling work.
- Turso and Upstash latency and error rates are acceptable from the new region.
- GA4 receives real-time page views and guide events after consent.
- AdSense loads only on eligible pages and `/ads.txt` is publicly reachable.
- `robots.txt`, all sitemaps, canonical URLs, and Search Console fetches work.
- The Observatory and ingestion GitHub Actions succeed on schedule.
- Cloudflare serves valid TLS with Full (strict) origin verification.
- The host bill projects to no more than $12 per month at current traffic.
- A DNS rollback to Vercel has been rehearsed or verified from written steps.

## Decision checkpoints

Use these rules instead of revisiting every provider from scratch:

- **Railway remains under $10 per month and stable:** stay on Railway.
- **Railway exceeds $10 because of steady memory:** move the same container to DigitalOcean App Platform's fixed 1 GB plan.
- **Managed hosting exceeds $15 to $20 for three months:** evaluate a 2 GB DigitalOcean Droplet or an available 4 GB Hetzner VPS.
- **Cold starts and ephemeral cache are acceptable and cost is the top priority:** benchmark Cloud Run.
- **The site needs two or more app replicas:** implement shared Next.js cache and Server Action deployment coordination before scaling out.
- **The app becomes mostly static:** reconsider Cloudflare Workers only after running vinext compatibility checks and integration tests.
- **A migration cannot be completed before the Vercel CPU limit is reached:** use Vercel Pro as a one-month bridge.

## Sources checked

- [Vercel Fluid compute pricing](https://vercel.com/docs/functions/usage-and-pricing)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Railway pricing](https://docs.railway.com/pricing)
- [Railway Next.js guide](https://docs.railway.com/guides/fullstack-nextjs)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [DigitalOcean App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/)
- [DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets)
- [Fly.io pricing](https://fly.io/docs/about/pricing/)
- [Hetzner cloud price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [AWS Lightsail pricing](https://aws.amazon.com/lightsail/pricing/)
- [Google Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Render pricing](https://render.com/pricing)
- [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare DNS full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Cloudflare cache behavior](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)
- [Cloudflare Full (strict) TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Turso pricing](https://turso.tech/pricing)
- [Upstash Redis pricing](https://upstash.com/pricing/redis)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Clerk webhook debugging](https://clerk.com/docs/guides/development/webhooks/debugging)
- [Google tag configuration](https://developers.google.com/tag-platform/gtagjs/configure)
- [Google AdSense ads.txt guide](https://support.google.com/adsense/answer/12171612)
- [Google AdSense site connection guide](https://support.google.com/adsense/answer/7584263)
