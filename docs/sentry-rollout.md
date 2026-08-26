# Sentry rollout

Cosmic Index sends application errors, 10% of production performance traces,
and voluntary bug reports to the `naqis-org/cosmic-index` Sentry project. Local
development captures all traces. Session Replay, log capture, screenshots,
default PII collection, and the Sentry request tunnel are disabled.

## Deployment configuration

Add this secret to Vercel for Production and Preview, then redeploy:

```text
SENTRY_AUTH_TOKEN=<project-scoped Sentry auth token>
```

The token is used only while building to create releases and upload source maps.
Never expose it with a `NEXT_PUBLIC_` prefix or commit it. The wizard-created
`.env.sentry-build-plugin` file is ignored and is only for local source-map test
builds.

The public DSN and project coordinates have safe defaults in the repository.
They can be overridden without code changes:

```text
NEXT_PUBLIC_SENTRY_DSN=<public project DSN>
SENTRY_DSN=<server/edge DSN; normally the same public DSN>
SENTRY_ORG=naqis-org
SENTRY_PROJECT=cosmic-index
```

Optional explicit environment and release tags are available when a deployment
needs to override the automatic values:

```text
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=<release name>
SENTRY_RELEASE=<same release name>
```

If release values are configured, the client and server values must match
exactly. On Vercel, leaving them unset lets the build integration and
`VERCEL_GIT_COMMIT_SHA` provide the normal release identity.

## Verification after deployment

1. Confirm the Vercel build log reports a successful Sentry source-map upload.
2. Use the real application and submit one identifiable report through the
   footer's **Report a bug** button.
3. Trigger one known, non-production test error through a temporary protected
   route or preview deployment; remove the trigger immediately afterward.
4. In Sentry, confirm the new issue and feedback arrive in
   `naqis-org/cosmic-index`, the environment and release tags are correct, and
   application stack frames show readable source context.
5. Confirm `/privacy` neither initializes the browser SDK nor displays the bug
   report button.

Do not repeatedly trigger errors in production. If event volume is too high,
reduce the production trace sample rate in `src/lib/sentry.ts`; error events are
not controlled by that trace rate.
