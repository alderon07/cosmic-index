"use client";

declare global {
  interface Window {
    va?: (
      eventType: "event",
      payload: {
        name: string;
        data: Record<string, unknown>;
      }
    ) => void;
  }
}

const SESSION_ID_KEY = "cosmic-index:session-id:v1";

export type CompareSource =
  | "object-card-grid"
  | "object-card-list"
  | "object-detail"
  | "compare-tray"
  | "compare-table";

export type CompareDomain = "exoplanets" | "stars" | "small-bodies";
export type CompareBlockedReason =
  | "cross-domain"
  | "unsupported"
  | "limit"
  | "storage-error"
  | "mode-disabled";

interface BaseEventPayload {
  sessionId?: string;
}

export interface AnalyticsEventMap {
  object_card_viewed: BaseEventPayload & {
    objectId: string;
    objectType: "EXOPLANET" | "STAR" | "SMALL_BODY";
    view: "grid" | "list";
  };
  object_detail_viewed: BaseEventPayload & {
    objectId: string;
    objectType: "EXOPLANET" | "STAR" | "SMALL_BODY";
  };
  compare_add: BaseEventPayload & {
    objectId: string;
    domain: CompareDomain;
    source: CompareSource;
    position: number;
    revision: number;
  };
  compare_remove: BaseEventPayload & {
    objectId: string;
    domain: CompareDomain;
    source: CompareSource;
    revision: number;
  };
  compare_open: BaseEventPayload & {
    domain: CompareDomain;
    itemCount: number;
  };
  compare_expand: BaseEventPayload & {
    domain: CompareDomain;
    itemCount: number;
  };
  compare_clear: BaseEventPayload & {
    domain: CompareDomain;
    itemCount: number;
  };
  compare_tray_open: BaseEventPayload & {
    domain: CompareDomain;
    source: CompareSource;
    itemCount: number;
  };
  compare_dialog_open: BaseEventPayload & {
    domain: CompareDomain;
    source: CompareSource;
    itemCount: number;
  };
  compare_action_result: BaseEventPayload & {
    action: "add" | "remove" | "clear";
    result: "ok" | "blocked";
    reason?: CompareBlockedReason;
    mode: CompareDomain | "none";
    source: CompareSource;
  };
  compare_blocked_domain: BaseEventPayload & {
    attemptedDomain: CompareDomain;
    activeDomain: CompareDomain | "none";
    blockedReason: CompareBlockedReason;
    source: CompareSource;
  };
  compare_conflict_recovered: BaseEventPayload & {
    domain: CompareDomain;
    retries: number;
  };
  compare_restore_failed: BaseEventPayload & {
    reason: "parse-error" | "unknown-version";
  };
  compare_storage_parse_failed: BaseEventPayload & {
    reason:
      | "parse-error"
      | "unknown-version"
      | "mixed-domains"
      | "unknown-domain"
      | "invalid-item"
      | "mode-disabled";
  };
  compare_storage_reset_shown: BaseEventPayload & {
    reason:
      | "parse-error"
      | "unknown-version"
      | "mixed-domains"
      | "unknown-domain"
      | "invalid-item"
      | "mode-disabled";
  };
  compare_capability_parse_failed: BaseEventPayload & {
    rawValue: string;
  };
  visualizer_rendered: BaseEventPayload & {
    objectType: "EXOPLANET" | "STAR" | "SMALL_BODY";
    metricCount: number;
  };
  timeline_bucket_hover: BaseEventPayload & {
    pageType: "fireballs" | "close-approaches" | "space-weather";
    bucketStart: string;
    bucketEnd: string;
    count: number;
  };
  timeline_bucket_click: BaseEventPayload & {
    pageType: "fireballs" | "close-approaches" | "space-weather";
    bucketStart: string;
    bucketEnd: string;
    count: number;
    actionable: boolean;
  };
  perf_degrade_mode_enabled: BaseEventPayload & {
    component: "compare-tray" | "object-visualizer" | "event-timeline";
    metric: string;
    p95Ms: number;
    budgetMs: number;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

function randomSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = randomSessionId();
  window.sessionStorage.setItem(SESSION_ID_KEY, next);
  return next;
}

export function trackEvent<TName extends AnalyticsEventName>(
  name: TName,
  payload: AnalyticsEventMap[TName]
): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPayload: Record<string, unknown> = {
    ...payload,
    sessionId: payload.sessionId ?? getSessionId(),
    timestamp: Date.now(),
  };

  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${name}`, normalizedPayload);
  }

  if (typeof window.va === "function") {
    window.va("event", { name, data: normalizedPayload });
  }
}
