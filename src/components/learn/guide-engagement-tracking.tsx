"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { getGuideEngagementEvent } from "@/lib/guide-events";

// Mounted only alongside configured Google Analytics. The existing publisher
// integration owns script loading and consent. This does not load another SDK.
export function GuideEngagementTracking() {
  useEffect(() => {
    function onInteraction(event: Event) {
      if (!window.dataLayer || window.location.pathname === "/privacy") return;
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("[data-guide-event]");
      if (!element) return;
      const action = getGuideEngagementEvent(element.dataset.guideEvent, element.dataset.guideSlug);
      if (!action || (action.name === "guide_calculator_change") !== (event.type === "change")) return;
      sendGAEvent("event", action.name, { guide_slug: action.guide });
    }
    document.addEventListener("click", onInteraction, true);
    document.addEventListener("change", onInteraction, true);
    return () => {
      document.removeEventListener("click", onInteraction, true);
      document.removeEventListener("change", onInteraction, true);
    };
  }, []);
  return null;
}
