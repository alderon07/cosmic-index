"use client";

import { useSyncExternalStore, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_KEY,
  createAnalyticsConsent,
  discardQueuedAnalyticsEvents,
  type AnalyticsChoice,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

let googleId: string | null = null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function clearAnalyticsCookies() {
  try {
    const names = document.cookie.split(";").map((entry) => entry.trim().split("=")[0])
      .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid" || name === "_gat" || name.startsWith("_gat_"));
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    const domains = ["", ...parts.map((_, index) => parts.slice(index).join("."))];
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=/;${domain ? ` Domain=${domain};` : ""} SameSite=Lax`;
      }
    }
  } catch {
    // Consent still applies when the browser blocks cookie access.
  }
}

const consent = createAnalyticsConsent({
  read: () => window.localStorage.getItem(ANALYTICS_CONSENT_KEY),
  write: (raw) => window.localStorage.setItem(ANALYTICS_CONSENT_KEY, raw),
  command: (command) => {
    window.dataLayer ??= [];
    // Google reads Arguments objects from dataLayer. A rest array changes that shape.
    // eslint-disable-next-line prefer-rest-params
    function enqueue(...args: typeof command) { void args; window.dataLayer?.push(arguments); }
    enqueue(...command);
  },
  disableGoogle: (disabled) => { if (googleId) Reflect.set(window, `ga-disable-${googleId}`, disabled); },
  clearCookies: clearAnalyticsCookies,
  discardPendingEvents: () => {
    try {
      if (window.dataLayer) discardQueuedAnalyticsEvents(window.dataLayer);
    } catch {
      // The live disable flag and consent update still block collection.
    }
  },
});

// Called by the publisher component's effect before it can mount any tags.
export function initializeAnalyticsConsent(id: string | null): () => void {
  if (googleId && googleId !== id) Reflect.set(window, `ga-disable-${googleId}`, true);
  googleId = id;
  consent.initialize();
  if (googleId) Reflect.set(window, `ga-disable-${googleId}`, consent.getSnapshot() !== "granted");
  const onStorage = (event: StorageEvent) => {
    if (event.key === ANALYTICS_CONSENT_KEY || event.key === null) consent.refresh();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function analyticsCollectionAllowed(): boolean {
  return consent.getSnapshot() === "granted" && window.location.pathname !== "/privacy" && !window.location.pathname.startsWith("/privacy/");
}

export function useAnalyticsConsent(): AnalyticsConsent {
  return useSyncExternalStore(consent.subscribe, consent.getSnapshot, (): AnalyticsConsent => "loading");
}

export function AnalyticsConsentSettings({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const state = useAnalyticsConsent();
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  if (!alwaysVisible && ((state !== "unknown" && message === null) || pathname === "/privacy")) return null;
  function choose(choice: AnalyticsChoice) {
    const persisted = consent.choose(choice);
    setMessage(persisted
      ? choice === "granted" ? "Analytics accepted. You can change this choice here at any time." : "Analytics declined. Optional analytics collection is off."
      : "Your choice applies to this page, but your browser could not save it. It may not be remembered after a reload.");
  }
  return (
    <section aria-labelledby={alwaysVisible ? "analytics-settings-title" : "analytics-prompt-title"} className="border-y border-orange-200/20 bg-[#17100c] px-5 py-5 text-sm text-orange-100/80">
      <div className="mx-auto max-w-4xl">
        <h2 id={alwaysVisible ? "analytics-settings-title" : "analytics-prompt-title"} className="font-display text-base text-orange-100">Optional analytics</h2>
        <p className="mt-2 leading-7">Allow Google Analytics and Vercel Analytics to measure page visits and guide interactions? Google Analytics uses cookies. Your choice does not affect access to the site or your saved guides.</p>
        {alwaysVisible ? <p className="mt-2">Current choice: {state === "granted" ? "accepted" : state === "denied" ? "declined" : "not accepted"}.</p> : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={state === "loading"} onClick={() => choose("denied")} className="min-h-11 rounded border border-orange-200/40 px-4 py-2 hover:bg-orange-100/10 focus-visible:outline-2 focus-visible:outline-offset-2">Decline analytics</button>
          <button type="button" disabled={state === "loading"} onClick={() => choose("granted")} className="min-h-11 rounded border border-orange-200/40 px-4 py-2 hover:bg-orange-100/10 focus-visible:outline-2 focus-visible:outline-offset-2">Accept analytics</button>
          <a href="/privacy#analytics-settings" className="inline-flex min-h-11 items-center underline underline-offset-4">Privacy and settings</a>
        </div>
        {message ? <p role="status" className="mt-3 leading-7">{message}</p> : null}
      </div>
    </section>
  );
}
