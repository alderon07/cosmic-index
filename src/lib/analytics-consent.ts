import { z } from "zod";

export const ANALYTICS_CONSENT_KEY = "cosmic-index:analytics-consent:v1";
const choiceSchema = z.object({ version: z.literal(1), analytics: z.enum(["granted", "denied"]) }).strict();
export type AnalyticsChoice = z.infer<typeof choiceSchema>["analytics"];
export type AnalyticsConsent = AnalyticsChoice | "unknown" | "loading";
export type ConsentCommand = ["consent", "default" | "update", {
  analytics_storage: AnalyticsChoice;
  ad_storage?: AnalyticsChoice;
  ad_user_data?: AnalyticsChoice;
  ad_personalization?: AnalyticsChoice;
}];

export function parseAnalyticsChoice(raw: string | null): AnalyticsChoice | "unknown" {
  if (!raw || raw.length > 256) return "unknown";
  try {
    const result = choiceSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data.analytics : "unknown";
  } catch { return "unknown"; }
}

interface ConsentEnvironment {
  read(): string | null;
  write(raw: string): void;
  command(command: ConsentCommand): void;
  disableGoogle(disabled: boolean): void;
  clearCookies(): void;
  discardPendingEvents(): void;
}

const QUEUED_GUIDE_EVENT_NAMES = new Set([
  "guide_save",
  "guide_remove",
  "guide_tool_open",
  "guide_calculator_change",
]);

function isQueuedGuideEvent(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !("0" in value) || !("1" in value)) {
    return false;
  }

  return value[0] === "event" &&
    typeof value[1] === "string" &&
    QUEUED_GUIDE_EVENT_NAMES.has(value[1]);
}

export function discardQueuedAnalyticsEvents(queue: unknown[]): void {
  const retained = queue.filter((entry) => !isQueuedGuideEvent(entry));
  queue.splice(0, queue.length, ...retained);
}

// The browser adapter is injected so ordering and storage failures can be
// exercised without replacing React or Google's SDK in tests.
export function createAnalyticsConsent(environment: ConsentEnvironment) {
  let state: AnalyticsConsent = "loading";
  const listeners = new Set<() => void>();
  function apply(next: Exclude<AnalyticsConsent, "loading">) {
    state = next;
    environment.disableGoogle(next !== "granted");
    environment.command(["consent", "update", { analytics_storage: next === "granted" ? "granted" : "denied" }]);
    if (next !== "granted") {
      environment.discardPendingEvents();
      environment.clearCookies();
    }
    listeners.forEach((listener) => listener());
  }
  function refresh() {
    let next: Exclude<AnalyticsConsent, "loading"> = "unknown";
    try { next = parseAnalyticsChoice(environment.read()); } catch { /* Storage unavailable: no consent. */ }
    apply(next);
  }
  return {
    getSnapshot: (): AnalyticsConsent => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    initialize() {
      if (state !== "loading") return;
      environment.disableGoogle(true);
      environment.command(["consent", "default", {
        analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
      }]);
      refresh();
    },
    refresh,
    choose(choice: AnalyticsChoice) {
      // Apply immediately, even if persistence is unavailable.
      apply(choice);
      try {
        environment.write(JSON.stringify({ version: 1, analytics: choice }));
        return true;
      } catch { return false; }
    },
  };
}
