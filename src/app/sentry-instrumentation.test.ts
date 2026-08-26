import { describe, expect, test } from "bun:test";

async function readProjectFile(path: string): Promise<string> {
  return Bun.file(new URL(`../../${path}`, import.meta.url)).text();
}

describe("Sentry Next.js instrumentation", () => {
  test("initializes the browser, node, and edge runtimes", async () => {
    const [client, server, edge] = await Promise.all([
      readProjectFile("src/instrumentation-client.ts"),
      readProjectFile("sentry.server.config.ts"),
      readProjectFile("sentry.edge.config.ts"),
    ]);

    for (const source of [client, server, edge]) {
      expect(source).toContain('from "@sentry/nextjs"');
      expect(source).toContain("Sentry.init");
      expect(source).toContain("tracesSampleRate");
      expect(source).toContain("sendDefaultPii: false");
      expect(source).toContain("...getSentryReleaseOverride(");
      expect(source).not.toContain("replayIntegration");
      expect(source).not.toContain("enableLogs: true");
    }

    expect(client).toContain("captureRouterTransitionStart");
    expect(client).toContain("feedbackIntegration");
    expect(client).toContain("autoInject: false");
    expect(client).toContain('window.location.pathname !== "/privacy"');
  });

  test("loads server instrumentation for each runtime and captures request errors", async () => {
    const source = await readProjectFile("src/instrumentation.ts");

    expect(source).toContain('process.env.NEXT_RUNTIME === "nodejs"');
    expect(source).toContain('process.env.NEXT_RUNTIME === "edge"');
    expect(source).toContain("sentry.server.config");
    expect(source).toContain("sentry.edge.config");
    expect(source).toContain("Sentry.captureRequestError");
  });

  test("captures both route-segment and root-layout rendering errors", async () => {
    const [segmentError, globalError] = await Promise.all([
      readProjectFile("src/app/error.tsx"),
      readProjectFile("src/app/global-error.tsx"),
    ]);

    expect(segmentError).toContain("Sentry.captureException(error)");
    expect(globalError).toContain("Sentry.captureException(error)");
    expect(globalError).toContain("<html");
    expect(globalError).toContain("<body");
  });

  test("wraps Next config for source-map uploads without adding a traffic tunnel", async () => {
    const source = await readProjectFile("next.config.ts");

    expect(source).toContain("withSentryConfig");
    expect(source).toContain("widenClientFileUpload: true");
    expect(source).not.toContain("tunnelRoute");
  });

  test("places an accessible report button in the global footer", async () => {
    const [layout, button] = await Promise.all([
      readProjectFile("src/app/layout.tsx"),
      readProjectFile("src/components/report-bug-button.tsx"),
    ]);

    expect(layout).toContain("<ReportBugButton");
    expect(button).toContain("Sentry.getFeedback()");
    expect(button).toContain("feedback.attachTo");
    expect(button).toContain("Report a bug");
    expect(button).toContain('type="button"');
  });
});
