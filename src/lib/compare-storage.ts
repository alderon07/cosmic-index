"use client";

import {
  COMPARE_STORAGE_KEY,
  CompareDomain,
  CompareItem,
  CompareStateV1,
  compareDomainFromCompareId,
  emptyCompareState,
} from "@/lib/compare-facts";

const ALL_DOMAINS: CompareDomain[] = ["exoplanets", "stars", "small-bodies"];

export type CompareStorageErrorReason =
  | "parse-error"
  | "unknown-version"
  | "mixed-domains"
  | "unknown-domain"
  | "invalid-item"
  | "mode-disabled";

export type ReadCompareStorageResult =
  | { ok: true; state: CompareStateV1; repaired: boolean }
  | { ok: false; reason: CompareStorageErrorReason };

interface ParseOptions {
  allowedDomains?: CompareDomain[];
}

type ParsedItemResult =
  | { ok: true; item: CompareItem }
  | { ok: false; reason: "invalid-item" | "unknown-domain" };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCompareFact(value: unknown): value is CompareItem["facts"][number] {
  return (
    isObject(value) &&
    typeof value.key === "string" &&
    value.key.length > 0 &&
    typeof value.value === "string" &&
    (value.unit === undefined || typeof value.unit === "string")
  );
}

function parseItem(value: unknown): ParsedItemResult {
  if (!isObject(value)) return { ok: false, reason: "invalid-item" };

  const id = typeof value.id === "string" ? value.id : "";
  const domainFromId = compareDomainFromCompareId(id);
  if (!domainFromId) {
    return { ok: false, reason: "unknown-domain" };
  }

  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  if (!displayName) {
    return { ok: false, reason: "invalid-item" };
  }

  if (!Array.isArray(value.facts) || value.facts.some((fact) => !isCompareFact(fact))) {
    return { ok: false, reason: "invalid-item" };
  }

  const snapshotLevel = value.snapshotLevel === "list" ? "list" : "detail";
  const discoveredYear = typeof value.discoveredYear === "number" ? value.discoveredYear : undefined;
  const subtitle = typeof value.subtitle === "string" ? value.subtitle : undefined;

  return {
    ok: true,
    item: {
      id,
      domain: domainFromId,
      displayName,
      subtitle,
      discoveredYear,
      snapshotLevel,
      facts: value.facts,
    },
  };
}

export function parseCompareState(value: string, options?: ParseOptions): ReadCompareStorageResult {
  const allowed = new Set(options?.allowedDomains?.length ? options.allowedDomains : ALL_DOMAINS);

  try {
    const parsed = JSON.parse(value) as Partial<CompareStateV1>;

    if (parsed.version !== 1) {
      return { ok: false, reason: "unknown-version" };
    }

    if (!Array.isArray(parsed.items)) {
      return { ok: false, reason: "parse-error" };
    }

    const revision = typeof parsed.revision === "number" ? parsed.revision : 0;
    const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0;

    if (parsed.items.length === 0) {
      return {
        ok: true,
        repaired: false,
        state: {
          version: 1,
          revision,
          updatedAt,
          domain: null,
          items: [],
        },
      };
    }

    const normalizedItems: CompareItem[] = [];
    for (const item of parsed.items) {
      const parsedItem = parseItem(item);
      if (!parsedItem.ok) {
        return { ok: false, reason: parsedItem.reason };
      }
      normalizedItems.push(parsedItem.item);
    }

    // Deduplicate compare items by id while preserving insertion order.
    const dedupedItems = normalizedItems.filter(
      (item, index) => normalizedItems.findIndex((existing) => existing.id === item.id) === index
    );

    if (dedupedItems.length === 0) {
      return {
        ok: true,
        repaired: false,
        state: {
          version: 1,
          revision,
          updatedAt,
          domain: null,
          items: [],
        },
      };
    }

    const inferredDomains = new Set<CompareDomain>(dedupedItems.map((item) => item.domain));
    if (inferredDomains.size > 1) {
      return { ok: false, reason: "mixed-domains" };
    }

    const inferredDomain = dedupedItems[0].domain;
    if (!allowed.has(inferredDomain)) {
      return { ok: false, reason: "mode-disabled" };
    }

    if (
      parsed.domain !== null &&
      parsed.domain !== undefined &&
      parsed.domain !== inferredDomain
    ) {
      return {
        ok: true,
        repaired: true,
        state: {
          version: 1,
          revision,
          updatedAt,
          domain: inferredDomain,
          items: dedupedItems.map((item) => ({ ...item, domain: inferredDomain })),
        },
      };
    }

    if (parsed.domain === undefined || parsed.domain === null) {
      return {
        ok: true,
        repaired: true,
        state: {
          version: 1,
          revision,
          updatedAt,
          domain: inferredDomain,
          items: dedupedItems.map((item) => ({ ...item, domain: inferredDomain })),
        },
      };
    }

    if (!allowed.has(parsed.domain)) {
      return { ok: false, reason: "mode-disabled" };
    }

    return {
      ok: true,
      repaired: false,
      state: {
        version: 1,
        revision,
        updatedAt,
        domain: inferredDomain,
        items: dedupedItems.map((item) => ({ ...item, domain: inferredDomain })),
      },
    };
  } catch {
    return { ok: false, reason: "parse-error" };
  }
}

export function readCompareStorage(options?: ParseOptions): ReadCompareStorageResult {
  if (typeof window === "undefined") {
    return { ok: true, repaired: false, state: emptyCompareState() };
  }

  const raw = window.sessionStorage.getItem(COMPARE_STORAGE_KEY);
  if (!raw) {
    return { ok: true, repaired: false, state: emptyCompareState() };
  }

  return parseCompareState(raw, options);
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
  expectedRevision: number,
  options?: ParseOptions
):
  | { ok: true; state: CompareStateV1 }
  | { ok: false; currentState: CompareStateV1 } {
  const readResult = readCompareStorage(options);
  const currentState = readResult.ok ? readResult.state : emptyCompareState();

  if (currentState.revision !== expectedRevision) {
    return { ok: false, currentState };
  }

  writeCompareStorage(nextState);
  return { ok: true, state: nextState };
}
