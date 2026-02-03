# Cosmic Index -- Engineering & Product Summary

This project is an astronomy data platform that aggregates multiple
public scientific sources into a normalized, indexed, fast, and reliable
product.

The value of the product is:

→ normalization, indexing, relationships, stable pagination, and caching
over fragile upstream APIs.

------------------------------------------------------------------------

## 1. Core Domains (Do not mix these)

You must treat the data as three separate domains.

### A. Catalog objects

These are stable entities.

-   Exoplanets
-   Stars (host stars)
-   Small bodies (asteroids & comets)
-   (Later) meteorites / fireballs

These use the `CosmicObject` model.

### B. Event streams

These are time-based.

-   Space weather (DONKI)
-   Fireballs / atmospheric impacts

Do **not** force them into `CosmicObject`.

### C. Media

-   NASA Images
-   APOD

Do **not** mix media into object models.

------------------------------------------------------------------------

## 2. Data sources to use

### Exoplanets & host star properties

NASA Exoplanet Archive -- TAP API

Table: ps

Planet columns: - pl_name - hostname - discoverymethod - disc_year -
pl_orbper - pl_rade - pl_masse - pl_eqt

System / star columns: - sy_snum - sy_pnum - sy_dist - ra - dec

Stellar columns: - st_spectype - st_teff - st_mass - st_rad - st_lum -
st_met - st_age - sy_vmag - sy_kmag

------------------------------------------------------------------------

### Small bodies

JPL Small-Body Database (SBDB)

Browse / index: https://ssd-api.jpl.nasa.gov/sbdb_query.api

Detail: https://ssd-api.jpl.nasa.gov/sbdb.api

------------------------------------------------------------------------

### Space weather

NASA DONKI: - FLR - CME - GST

------------------------------------------------------------------------

### Fireballs

CNEOS fireball API

------------------------------------------------------------------------

### Media

NASA Image and Video Library API + APOD

------------------------------------------------------------------------

## 3. Critical architectural decision

Source = truth\
Local index = product

------------------------------------------------------------------------

## 4. Indexing strategy

### Exoplanets

-   Browse: TAP (guarded pagination)
-   Detail: TAP + cache

### Stars

-   Browse/search: SQLite index
-   Detail: SQLite
-   Planets in system: live TAP

Ingestion query (keyset pagination):

SELECT hostname, COUNT(DISTINCT pl_name) AS planet_count ... FROM ps
WHERE default_flag=1 AND hostname \> '{lastHostname}' GROUP BY hostname
ORDER BY hostname ASC

------------------------------------------------------------------------

### Small bodies

-   Browse/search: local index
-   Detail: JPL live + cache

------------------------------------------------------------------------

## 5. Meteorites / fireballs

-   Live feed → CNEOS

------------------------------------------------------------------------

## 6. APIs

-   /api/exoplanets
-   /api/stars
-   /api/small-bodies
-   /api/space-weather
-   /api/fireballs
-   /api/images
-   /api/apod

------------------------------------------------------------------------

## 7. Shared TAP client

src/lib/nasa-tap.ts

Exports: - executeTAPQuery - escapeAdqlString - sanitizeForLike

------------------------------------------------------------------------

## 8. Pagination rules

-   TAP: no OFFSET
-   Clamp MAX_PAGE, MAX_OFFSET
-   Local DB: normal paging

------------------------------------------------------------------------

## 9. UI features

-   Stars browse + detail + planets in system
-   Media gallery on detail pages
-   Space weather timeline
-   Fireballs list
-   APOD card

------------------------------------------------------------------------

## 10. Caching

Upstash Redis for: - detail endpoints - events - images - APOD

------------------------------------------------------------------------

## 11. Monetization

-   Pro tier (alerts, saved, exports)
-   API tier
-   Education tier

------------------------------------------------------------------------

## 12. Accounts

-   Clerk or Auth.js
-   Stripe

------------------------------------------------------------------------

## 13. Ingestion

-   GitHub Actions cron
-   manual deploy script

------------------------------------------------------------------------

## 14. Principles

-   Index only browse data
-   Detail always live + cached
-   Keep domains separate

------------------------------------------------------------------------

## 15. Product insight

The product is the indexing, normalization, relationships and
reliability layer.
