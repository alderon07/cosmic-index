"use client";

import {
  COMPARE_STORAGE_KEY,
  CompareStateV1,
  emptyCompareState,
} from "@/lib/compare-facts";

export type CompareStorageErrorReason = "parse-error" | "unknown-version";

export type ReadCompareStorageResult =
  | { ok: true; state: CompareStateV1 }
  | { ok: false; reason: CompareStorageErrorReason };

export function parseCompareState(value: string): ReadCompareStorageResult {
  try {
    const parsed = JSON.parse(value) as Partial<CompareStateV1>;
    if (parsed.version !== 1) {
      return { ok: false, reason: "unknown-version" };
    }
    if (!Array.isArray(parsed.items)) {
      return { ok: false, reason: "parse-error" };
    }
    return {
      ok: true,
      state: {
        version: 1,
        revision: typeof parsed.revision === "number" ? parsed.revision : 0,
        updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
        domain: parsed.domain === "exoplanets" ? parsed.domain : null,
        items: parsed.items.filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "domain" in item &&
            "displayName" in item &&
            "facts" in item
        ) as CompareStateV1["items"],
      },
    };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}

export function readCompareStorage(): ReadCompareStorageResult {
  if (typeof window === "undefined") {
    return { ok: true, state: emptyCompareState() };
  }

  const raw = window.sessionStorage.getItem(COMPARE_STORAGE_KEY);
  if (!raw) {
    return { ok: true, state: emptyCompareState() };
  }

  return parseCompareState(raw);
}

export function clearCompareStorage(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(COMPARE_STORAGE_KEY);
}

export function writeCompareStorage(state: CompareStateV1): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state));
}

export function writeCompareStorageWithRevision(
  nextState: CompareStateV1,
  expectedRevision: number
):
  | { ok: true; state: CompareStateV1 }
  | { ok: false; currentState: CompareStateV1 } {
  const readResult = readCompareStorage();
  const currentState = readResult.ok ? readResult.state : emptyCompareState();

  if (currentState.revision !== expectedRevision) {
    return { ok: false, currentState };
  }

  writeCompareStorage(nextState);
  return { ok: true, state: nextState };
}
