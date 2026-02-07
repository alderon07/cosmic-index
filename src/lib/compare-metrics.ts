export type CompareMetricEventType =
  | "object_card_viewed"
  | "object_detail_viewed"
  | "compare_open"
  | "compare_expand"
  | "compare_add"
  | "detail_followthrough"
  | "session_end_without_followthrough";

export interface CompareMetricEvent {
  type: CompareMetricEventType;
}

export function isEligibleCompareSession(events: CompareMetricEvent[]): boolean {
  const interactions = events.filter(
    (event) =>
      event.type === "object_card_viewed" || event.type === "object_detail_viewed"
  );
  return interactions.length >= 2;
}

export function hasCompareEntry(events: CompareMetricEvent[]): boolean {
  return events.some((event) => event.type === "compare_open");
}

export function hasCompareCompletion(events: CompareMetricEvent[]): boolean {
  return events.some((event) => event.type === "compare_expand");
}

export function hasDetailFollowthrough(events: CompareMetricEvent[]): boolean {
  return events.some((event) => event.type === "detail_followthrough");
}

export function hasAbandonAfterCompareAdd(events: CompareMetricEvent[]): boolean {
  const added = events.some((event) => event.type === "compare_add");
  if (!added) return false;
  return events.some(
    (event) => event.type === "session_end_without_followthrough"
  );
}
