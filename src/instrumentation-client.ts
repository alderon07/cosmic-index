import * as Sentry from "@sentry/nextjs";
import {
  DEFAULT_SENTRY_DSN,
  getSentryEnvironment,
  getSentryReleaseOverride,
  getSentryTracesSampleRate,
} from "@/lib/sentry";

const enabled = window.location.pathname !== "/privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? DEFAULT_SENTRY_DSN,
  enabled,
  environment: getSentryEnvironment(
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    undefined,
    process.env.NODE_ENV,
  ),
  ...getSentryReleaseOverride(
    process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    undefined,
  ),
  tracesSampleRate: getSentryTracesSampleRate(process.env.NODE_ENV),
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  integrations: [
    Sentry.feedbackIntegration({
      autoInject: false,
      colorScheme: "dark",
      enableScreenshot: false,
      formTitle: "Report a bug",
      isEmailRequired: false,
      isNameRequired: false,
      messageLabel: "What went wrong?",
      messagePlaceholder:
        "Tell us what happened and what you expected. Please do not include passwords, billing details, or other sensitive information.",
      showEmail: true,
      showName: false,
      submitButtonLabel: "Send bug report",
      successMessageText:
        "Report received. Thank you for helping improve Cosmic Index.",
      triggerAriaLabel: "Open the bug report form",
      triggerLabel: "Report a bug",
    }),
  ],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
