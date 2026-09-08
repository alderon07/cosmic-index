import { describe, expect, it } from "bun:test";
import {
  createAnalyticsConsent,
  discardQueuedAnalyticsEvents,
  parseAnalyticsChoice,
  type ConsentCommand,
} from "./analytics-consent";

function setup(raw: string | null = null) {
  const commands: ConsentCommand[] = [];
  const disabled: boolean[] = [];
  let cleared = 0;
  let discarded = 0;
  let storageFails = false;
  const consent = createAnalyticsConsent({
    read: () => { if (storageFails) throw new Error("blocked"); return raw; },
    write: (value) => { if (storageFails) throw new Error("blocked"); raw = value; },
    command: (command) => commands.push(command),
    disableGoogle: (value) => disabled.push(value),
    clearCookies: () => { cleared++; },
    discardPendingEvents: () => { discarded++; },
  });
  return {
    consent,
    commands,
    disabled,
    get cleared() { return cleared; },
    get discarded() { return discarded; },
    failStorage: () => { storageFails = true; },
    replace: (value: string | null) => { raw = value; },
  };
}

describe("analytics consent", () => {
  it("starts denied before restoring any explicit choice", () => {
    const state = setup();
    expect(state.consent.getSnapshot()).toBe("loading");
    state.consent.initialize();
    expect(state.consent.getSnapshot()).toBe("unknown");
    expect(state.disabled).toEqual([true, true]);
    expect(state.commands[0]).toEqual(["consent", "default", {
      analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
    }]);
  });

  it("persists acceptance and restores it after denied defaults", () => {
    const state = setup();
    state.consent.initialize();
    expect(state.consent.choose("granted")).toBe(true);
    expect(state.consent.getSnapshot()).toBe("granted");
    expect(state.disabled.at(-1)).toBe(false);
    expect(state.commands.at(-1)).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    const restored = setup('{"version":1,"analytics":"granted"}');
    restored.consent.initialize();
    expect(restored.disabled).toEqual([true, false]);
    expect(restored.consent.getSnapshot()).toBe("granted");
  });

  it("disables collection and deletes analytics cookies before notifying withdrawal", () => {
    const state = setup('{"version":1,"analytics":"granted"}');
    state.consent.initialize();
    state.consent.subscribe(() => {
      expect(state.disabled.at(-1)).toBe(true);
      expect(state.cleared).toBeGreaterThan(0);
      expect(state.discarded).toBeGreaterThan(0);
    });
    state.consent.choose("denied");
    expect(state.consent.getSnapshot()).toBe("denied");
    expect(state.commands.at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
  });

  it("does not repeat initialization during a React Strict Mode remount", () => {
    const state = setup('{"version":1,"analytics":"granted"}');
    state.consent.initialize();
    state.consent.initialize();
    expect(state.commands).toHaveLength(2);
    expect(state.commands[0]?.[1]).toBe("default");
    expect(state.commands[1]).toEqual(["consent", "update", { analytics_storage: "granted" }]);
  });

  it("honors rejection even if browser storage fails", () => {
    const state = setup('{"version":1,"analytics":"granted"}');
    state.consent.initialize();
    state.failStorage();
    expect(state.consent.choose("denied")).toBe(false);
    expect(state.consent.getSnapshot()).toBe("denied");
    expect(state.disabled.at(-1)).toBe(true);
  });

  it("handles withdrawal and clearing site data in another tab", () => {
    const state = setup('{"version":1,"analytics":"granted"}');
    state.consent.initialize();
    state.replace('{"version":1,"analytics":"denied"}');
    state.consent.refresh();
    expect(state.consent.getSnapshot()).toBe("denied");
    state.replace(null);
    state.consent.refresh();
    expect(state.consent.getSnapshot()).toBe("unknown");
  });

  it.each([null, "true", "{", '{"version":2,"analytics":"granted"}', '{"version":1,"analytics":"granted","extra":true}', 'x'.repeat(300)])("does not infer consent from invalid storage %s", (raw) => {
    expect(parseAnalyticsChoice(raw)).toBe("unknown");
  });
});

describe("queued analytics cleanup", () => {
  it("removes deferred guide events but preserves consent and unrelated data", () => {
    const guideEvent = { 0: "event", 1: "guide_save", 2: { guide_slug: "comparing-exoplanets" }, length: 3 };
    const queue: unknown[] = [
      { event: "publisher_message" },
      { 0: "consent", 1: "default", length: 3 },
      guideEvent,
      { 0: "event", 1: "purchase", length: 3 },
    ];

    discardQueuedAnalyticsEvents(queue);

    expect(queue).toEqual([
      { event: "publisher_message" },
      { 0: "consent", 1: "default", length: 3 },
      { 0: "event", 1: "purchase", length: 3 },
    ]);
  });
});
