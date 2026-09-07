# Publish and measure the field-guide improvements

This release gives first-time readers a complete TRAPPIST-1 comparison and a
browser-local reading list. It preserves mass labels in Compare, adds publisher
and methods information, and makes field guides available in the main navigation.
It does not guarantee AdSense approval or a revenue increase.

## Verify the deployment

1. Deploy the tested revision through the existing release workflow.
2. Open `/`, `/learn`, `/learn/trappist-1-comparison`, and `/about` on the public
   domain. Confirm the new content is present and the guide is not a 404.
3. Check the guide on mobile. Save it, reload, and find it in `/learn#reading-list`.
   Remove it with the save button. The list does not sync between devices.
4. Change the calculator from 30 days to 7 days. It should show about 4.7 orbits
   for b and 1.1 for e. Follow both planet links and check the source attribution.
5. Confirm `/sitemap.xml` includes the new guide and `/about`. In Search Console,
   inspect those URLs and submit the sitemap. Check the rendered page, canonical
   URL, indexing status, and any reported crawl errors.
6. Follow `docs/adsense-rollout.md` to verify publisher ownership, consent
   configuration, exact ad inventory, and the review request. Keep ad serving
   disabled until the site is approved. Do not click live ads during testing.

## Measure useful interactions

The existing Google Analytics integration now receives these events when it is
configured and initialized. Each includes only the published `guide_slug`, in
addition to the analytics platform's normal event context.

| Event | Trigger | Interpretation |
| --- | --- | --- |
| `guide_tool_open` | A guide link into the catalog is clicked | The reader starts investigating a record or catalog. |
| `guide_calculator_change` | The orbital interval is changed | The reader uses the interactive example. |
| `guide_save` | Save for later is clicked | Intent to return, not proof of a successful storage write. |
| `guide_remove` | A saved guide button is clicked | Intent to remove a guide from this browser. |

These events do not include search queries, calculator values, account details,
or the saved reading list. Ad blockers, unavailable analytics, and consent choices
can affect coverage. They do not block the feature itself.

1. Verify events in GA4 Realtime after a production deployment with analytics
   configured. Use an appropriate consent choice for the test session.
2. Register `guide_slug` as an event-scoped custom dimension if breakdowns by
   guide are needed. Mark `guide_tool_open` as a key event if starting a catalog
   investigation is the chosen activation measure.
3. Compare equivalent 28-day periods. Track organic acquisition, guide users,
   users who open a tool, calculator users, save intent, and returning users.
   Retain the original Reports snapshot outside the source repository.
4. Compare user counts alongside rates. A few users cannot establish a reliable
   ranking of topics or the cause of a change. Do not subtract new users from
   active users to infer the returning-user count.
5. After approval, read actual estimated earnings and page RPM in AdSense.
   The Analytics snapshot alone cannot estimate ad revenue. Avoid adding more
   ads until repeat use and content engagement support that decision.

## Choose the next investigation

Use Search Console queries and guide-to-catalog behavior to choose the next
case study. Extend a topic when readers ask a concrete question the current
guide does not answer. Good candidates are a documented asteroid flyby and a
historical space-weather sequence with matched timestamps.

For every case study, retain source URLs, a checked date, units, assumptions,
and calculations. Add an annotated figure and a direct next step into existing
records. Keep source snapshots static and reuse loaded data for interactions
so content growth does not create per-reader upstream requests.

Primary guidance:

- [Prepare pages for AdSense](https://support.google.com/adsense/answer/7299563)
- [Create helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
