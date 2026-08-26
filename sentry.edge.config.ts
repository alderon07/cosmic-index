import * as Sentry from "@sentry/nextjs";
import {
  DEFAULT_SENTRY_DSN,
  getSentryEnvironment,
  getSentryRelease,
  getSentryTracesSampleRate,
} from "./src/lib/sentry";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    DEFAULT_SENTRY_DSN,
  environment: getSentryEnvironment(
    process.env.SENTRY_ENVIRONMENT,
    process.env.VERCEL_ENV,
    process.env.NODE_ENV,
  ),
  release: getSentryRelease(
    process.env.SENTRY_RELEASE,
    process.env.VERCEL_GIT_COMMIT_SHA,
  ),
  tracesSampleRate: getSentryTracesSampleRate(process.env.NODE_ENV),
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
});
