"use client";

import { useEffect } from "react";
import { getGuideEngagementEvent } from "@/lib/guide-events";
import { analyticsCollectionAllowed } from "@/components/analytics-consent";

// Check the live choice on every interaction as well as gating SDK loading.
export function GuideEngagementTracking() {
  useEffect(() => {
    function onInteraction(event: Event) {
      if (!analyticsCollectionAllowed() || !window.gtag) return;
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("[data-guide-event]");
      if (!element) return;
      const action = getGuideEngagementEvent(element.dataset.guideEvent, element.dataset.guideSlug);
      if (!action || (action.name === "guide_calculator_change") !== (event.type === "change")) return;
      window.gtag("event", action.name, { guide_slug: action.guide });
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
