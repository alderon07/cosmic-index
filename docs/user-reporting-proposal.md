# User Reporting and Feedback Proposal

Status: Draft for review  
Last updated: 2026-07-14

## Summary

Add an authenticated, in-app way to report bugs, broken behavior, data
inaccuracies, accessibility problems, and other issues. Store accepted reports
in Turso and review them through a private internal inbox.

The report control should be visible to everyone, but submitting a report should
require a signed-in Clerk account. Do not send an email or create a GitHub issue
for every submission. This keeps the workflow useful without turning it into a
new source of notifications or spam.

## Goals

- Make reporting a problem easy from the place where it occurred.
- Attach enough context that most reports are actionable without follow-up.
- Prevent automated spam and limit noisy users.
- Keep database writes, Redis requests, storage, and maintenance within hobby
  account limits.
- Keep submitted content private and available only to internal administrators.
- Preserve accessibility, mobile usability, security, and graceful failure
  behavior.

## Non-goals for the first version

- Anonymous submissions.
- File, image, or video uploads.
- A public issue tracker or public report status page.
- Email notifications for individual reports.
- Automatic GitHub issue creation.
- A public reporting API.
- Rich text or rendered Markdown in user-submitted content.

## Recommended user experience

### Entry points

Add a **Report a problem** action in two places:

1. The global footer, for site-wide bugs and general issues.
2. Object and event detail views, where the application can automatically
   attach the relevant canonical ID, data source, and record timestamp.

The action opens a focused dialog. An anonymous visitor can open or see the
action, but is prompted to sign in before submitting.

### Form fields

Required fields:

- Category
- Short summary
- Details

Suggested categories:

- Bug
- Data inaccuracy
- Broken link or display
- Accessibility or usability
- Other

Conditional fields for a data inaccuracy:

- What value or statement appears incorrect?
- What should it be instead?
- Optional supporting HTTPS source

Recommended input bounds:

- Summary: 10-160 characters
- Details: 20-2,000 characters
- Expected value or correction: 500 characters maximum
- Supporting source URL: 500 characters maximum

The UI should show remaining character counts before limits become restrictive.

### Automatically captured context

Capture only useful, low-risk context:

- Internal page path and relevant query state
- Canonical object or event ID, when available
- Display name
- Upstream provider or dataset
- Source snapshot or record timestamp, when available
- Application version or deployment commit
- Submission timestamp

Do not capture the full browser URL if it could contain unneeded query data. Do
not capture arbitrary browser fingerprints, cookies, authorization data, or
client-side state.

### Submission result

On success, close or reset the form and show a confirmation with a report
reference. Do not promise a response time.

If submission fails, preserve the user's entered text and provide a retry action.
An idempotency key must prevent a retry from creating two reports.

## Anti-spam and abuse controls

### Authentication

- Require a Clerk-authenticated account to submit.
- Confirm that Clerk signup requires verified email before launch.
- Use the database-backed user record as the server-side identity source.
- Free and Pro accounts should have the same reporting access and limits.

Authentication is the primary spam barrier. It avoids placing CAPTCHA friction
in front of legitimate signed-in users.

### Rate limits

Add dedicated Upstash-backed report limits keyed by Clerk user ID:

- Cooldown: one accepted submission per minute
- Daily limit: five accepted submissions per rolling 24 hours
- Long-window limit: twenty accepted submissions per rolling 30 days

Internal administrators may bypass these limits for testing. Rate-limit checks
must be atomic, include `Retry-After` information where practical, and fail
closed in production if shared abuse protection is unavailable.

The existing general `USER_MUTATION` allowance is too broad for this feature;
reporting should have its own lower limits.

### Validation and content safety

- Validate all input with strict Zod schemas on the server.
- Reject unknown fields, oversized bodies, unsupported categories, and invalid
  context values.
- Normalize whitespace before validation and deduplication.
- Store submitted text as plain text.
- Never render submitted HTML or raw Markdown.
- Treat evidence URLs as untrusted input.
- Only make an evidence URL clickable after it passes the project's approved
  HTTPS-host policy. Otherwise render it as inert text.
- Do not accept attachments in the first version.

### Duplicate suppression

Generate a stable hash from normalized category, page or canonical context,
summary, and details.

- Reject an exact immediate retry through its idempotency key.
- If the same user already has an open report with the same deduplication hash,
  return the existing report reference instead of inserting another row.
- Do not silently merge reports from different users. Independent reports can be
  a useful severity signal and can be marked as duplicates during triage.

### Escalation if account-gated reporting is insufficient

Do not add CAPTCHA initially. If account creation abuse becomes material, add
Cloudflare Turnstile and continue enforcing user and client rate limits.

Turnstile tokens must be validated on the server. They expire after five minutes
and are single-use, so client-side widget completion alone is not sufficient.

Reference:
<https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>

## Application architecture

### Submission path

Use a Server Action for the first-party form mutation rather than adding a
public route handler.

The action should:

1. Require an authenticated user through `src/lib/auth.ts`.
2. Parse and strictly validate the submitted fields.
3. Validate internal page and canonical object context.
4. Apply cooldown, daily, and long-window limits.
5. Verify or generate the idempotency key and deduplication hash.
6. Insert the report in Turso within a bounded operation.
7. Return a small structured success or field-error result.

Next.js checks a Server Action request's origin against the host, which provides
CSRF protection for this first-party mutation. Authorization, validation, and
rate limiting are still required.

Reference:
<https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions>

Using a Server Action also avoids exposing a public reporting endpoint and does
not add a new public OpenAPI surface. If reporting is later exposed to external
clients, add a versioned route with matching authentication, validation, tests,
rate-limit behavior, and OpenAPI documentation.

### Client and server boundaries

- Keep page and report-context discovery in Server Components where practical.
- Use a small Client Component only for dialog interaction, category-dependent
  fields, pending state, and inline form feedback.
- Do not use `useEffect` for derived form state or event handling.
- Keep the form usable through normal form submission semantics and keyboard
  navigation.

## Data model

Add a new ordered migration, expected to be
`db/migrations/009_user_reports.sql`, and update `db/schema.sql` in the same
change. Do not apply the migration to production without explicit approval.

A proposed table shape is:

```sql
CREATE TABLE IF NOT EXISTS user_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  expected_value TEXT,
  evidence_url TEXT,
  page_path TEXT NOT NULL,
  canonical_id TEXT,
  display_name TEXT,
  source_name TEXT,
  source_snapshot_at TEXT,
  app_version TEXT,
  dedupe_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  resolution_note TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_id, idempotency_key)
);
```

The final migration should add `CHECK` constraints for categories and statuses.
Recommended statuses are:

- `new`
- `triaged`
- `resolved`
- `duplicate`
- `dismissed`

Recommended indexes:

- `(status, created_at DESC, id DESC)` for the internal inbox
- `(user_id, created_at DESC, id DESC)` for abuse checks and future history
- `(user_id, dedupe_hash)` for same-user duplicate detection

Avoid indexing long submitted text. Keep all administrator list queries cursor
paginated and bounded.

## Internal review workflow

Add an internal page such as `/settings/internal/reports` and protect it with
the existing `isInternalAdmin` mechanism.

The first version needs only:

- New-report count
- Cursor-paginated report list
- Filters for category and status
- Full plain-text report view
- Submitted context and safe evidence-source display
- Actions to mark triaged, resolved, duplicate, or dismissed
- Optional private resolution note

Do not send email for each report. The internal inbox is the source of truth. A
weekly digest can be considered later, but it should be opt-in and contain only
counts and direct links to the inbox.

Every internal read and mutation must re-check administrator authorization on
the server. The page should be `noindex`, and report content must not appear in
logs, analytics events, public exports, or generated metadata.

## Hobby-tier cost controls

- One Turso insert per accepted report.
- Reject abuse before touching Turso when possible.
- Keep text fields small and do not store attachments.
- Use bounded, indexed inbox queries.
- Do not poll for new reports from every page.
- Do not add per-report emails, webhooks, or automatic GitHub API calls.
- Consider deleting resolved, duplicate, and dismissed reports after 180 days
  once the feature has enough usage to justify cleanup automation.
- Run cleanup through an existing bounded operational workflow rather than
  creating a frequent new cron job solely for this table.

At the proposed maximum field sizes, report storage should remain modest. Usage
and rejection counts should be monitored before limits or retention are raised.

## Security and privacy review

- Reports are private user content, not public catalog data.
- Join the existing user row by ID instead of copying email into each report.
- Escape all text output through normal React rendering.
- Do not include report details in error logs.
- Do not allow arbitrary report-supplied redirects or navigation.
- Preserve canonical object ID rules from `src/lib/canonical-id.ts`.
- Prevent enumeration by never exposing a report lookup endpoint that accepts an
  unrestricted numeric ID.
- If users can later view their own report status, every query must include both
  report ID and authenticated user ID.
- Account deletion should remove associated reports through the foreign key.
- Document the retention period before adding anonymous or sensitive reporting.

## Accessibility and failure recovery

- Give the dialog an accessible title and description.
- Move focus into the dialog and restore it to the trigger on close.
- Associate every error with its field and announce submission results.
- Keep keyboard submission and dismissal predictable.
- Do not rely on color alone for category, error, or status meaning.
- Preserve entered text after validation, rate-limit, database, or network errors.
- Disable repeated submission only while the current attempt is pending.
- Handle database errors with a generic retryable message and a server-side
  request ID, without leaking implementation details.
- When rate-limited, tell the user when they can try again.

## Test plan

Follow TDD for behavioral work. Add failing focused tests before implementation.

### Submission tests

- Authenticated happy path
- Anonymous user rejected
- Strict schema rejects unknown and oversized fields
- Invalid category and context rejected
- Invalid or unsafe evidence URL handled safely
- Cooldown, daily, and 30-day limits
- Production rate limiter failure fails closed
- Idempotent retry returns the original report
- Same-user open duplicate does not insert another row
- Database failure returns a retryable result without losing form data
- Canonical object context is preserved correctly

### Authorization and admin tests

- Non-admin users cannot access the inbox or report details
- Admin list is bounded and cursor paginated
- Filters do not broaden access
- Status mutations validate state and administrator access
- Submitted HTML is displayed as text, not executed
- Unsafe source URLs are not rendered as active links

### UI tests

- Footer entry point works on mobile and desktop
- Object-detail entry point attaches the expected context
- Dialog focus behavior and accessible labels
- Category-dependent fields
- Pending, success, validation, rate-limit, and retry states
- Character limits and counters

### Migration tests

- Existing users remain valid
- User deletion cascades to reports
- Idempotency uniqueness is user scoped
- Status and category constraints reject invalid values
- Inbox and user-history indexes support bounded queries

## Rollout plan

### Phase 1: Private implementation

- Add tests, schema migration, data-access helpers, and rate limits.
- Add the internal inbox.
- Exercise the workflow with administrator accounts.
- Do not apply the production migration implicitly.

### Phase 2: Authenticated launch

- Add footer and contextual detail-view entry points.
- Require sign-in and verified email.
- Keep all email notifications disabled.
- Monitor accepted reports, rate-limit hits, duplicates, database growth, and
  review burden.

### Phase 3: Tune from evidence

- Adjust limits only after reviewing actual usage.
- Add an optional weekly digest if the inbox is being missed.
- Add Turnstile only if account-based abuse becomes material.
- Consider anonymous reporting only if the loss of legitimate reports is clear
  and the additional moderation cost is acceptable.

## Decisions to confirm before implementation

- [ ] Require verified email through Clerk.
- [ ] Use the proposed five-per-day and twenty-per-30-day limits.
- [ ] Include feature suggestions under `other`, or add a separate `suggestion`
      category.
- [ ] Make supporting evidence optional for data corrections.
- [ ] Use `/settings/internal/reports` for the private inbox.
- [ ] Keep report status private in the first version.
- [ ] Retain closed reports for 180 days before cleanup.
- [ ] Add the report action to both the footer and object/event detail views.

## Recommended decision

Proceed with the authenticated first version, no CAPTCHA, no uploads, no public
API, and no per-report notifications. Revisit anonymous submissions and digest
notifications only after real usage demonstrates a need.
