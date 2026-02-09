"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CompareDomain,
  CompareItem,
  CompareSnapshotLevel,
  CompareStateV1,
  MAX_COMPARE_ITEMS,
  compareDomainFromObject,
  createCompareItem,
  emptyCompareState,
  getCompareDomainCapabilities,
  getCompareDomainLabel,
} from "@/lib/compare-facts";
import {
  CompareStorageErrorReason,
  clearCompareStorage,
  readCompareStorage,
  writeCompareStorage,
  writeCompareStorageWithRevision,
} from "@/lib/compare-storage";
import { AnyCosmicObject } from "@/lib/types";
import { CompareBlockedReason, CompareSource, trackEvent } from "@/lib/analytics-events";

interface CompareContextValue {
  state: CompareStateV1;
  isExpanded: boolean;
  statusMessage: string | null;
  statusCanClearAndContinue: boolean;
  addObject: (object: AnyCosmicObject, source: CompareSource) => void;
  removeObject: (id: string, source: CompareSource) => void;
  clear: (source?: CompareSource) => void;
  clearAndRetryPendingAdd: () => void;
  cancelPendingAdd: () => void;
  openExpanded: () => void;
  closeExpanded: () => void;
  dismissStatus: () => void;
  isInCompare: (id: string) => boolean;
  isObjectSupported: (object: AnyCosmicObject) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

const RESET_REASON_KEY = "cosmic-index:compare:last-reset-reason:v1";

interface PendingAdd {
  object: AnyCosmicObject;
  source: CompareSource;
  attemptedDomain: CompareDomain;
}

function inferSnapshotLevel(source: CompareSource): CompareSnapshotLevel {
  if (source === "object-card-grid" || source === "object-card-list") {
    return "list";
  }
  return "detail";
}

function nextRevisionState(base: CompareStateV1, nextItems: CompareItem[]): CompareStateV1 {
  return {
    ...base,
    items: nextItems,
    domain: nextItems[0]?.domain ?? null,
    revision: base.revision + 1,
    updatedAt: Date.now(),
  };
}

function getResetStatusMessage(reason: CompareStorageErrorReason): string {
  if (reason === "mode-disabled") {
    return "Compare mode was temporarily disabled, so saved compare state was cleared.";
  }
  return "Your compare state was reset after an update.";
}

interface CompareProviderProps {
  children: React.ReactNode;
}

export function CompareProvider({ children }: CompareProviderProps) {
  const [state, setState] = useState<CompareStateV1>(() => emptyCompareState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<PendingAdd | null>(null);

  const capabilities = useMemo(() => getCompareDomainCapabilities(), []);
  const enabledDomainSet = useMemo(() => new Set(capabilities.enabledDomains), [capabilities.enabledDomains]);

  useEffect(() => {
    if (capabilities.parseFailed) {
      trackEvent("compare_capability_parse_failed", {
        rawValue: process.env.COMPARE_DOMAINS ?? "",
      });
    }
  }, [capabilities.parseFailed]);

  useEffect(() => {
    const result = readCompareStorage({ allowedDomains: capabilities.enabledDomains });
    if (result.ok) {
      if (result.repaired) {
        writeCompareStorage(result.state);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(result.state);
      return;
    }

    clearCompareStorage();
    setState(emptyCompareState());

    trackEvent("compare_storage_parse_failed", { reason: result.reason });

    if (typeof window !== "undefined") {
      const lastReason = window.sessionStorage.getItem(RESET_REASON_KEY);
      if (lastReason !== result.reason) {
        setStatusMessage(getResetStatusMessage(result.reason));
        window.sessionStorage.setItem(RESET_REASON_KEY, result.reason);
        trackEvent("compare_storage_reset_shown", { reason: result.reason });
      }
    }
  }, [capabilities.enabledDomains]);

  const isObjectSupported = useCallback(
    (object: AnyCosmicObject) => {
      const domain = compareDomainFromObject(object);
      return Boolean(domain && enabledDomainSet.has(domain));
    },
    [enabledDomainSet]
  );

  const commitWithConflictRecovery = useCallback(
    (mutate: (base: CompareStateV1) => CompareStateV1 | null) => {
      let finalState: CompareStateV1 | null = null;
      let retries = 0;
      setState((prev) => {
        let base = prev;
        while (retries < 3) {
          const storageResult = readCompareStorage({ allowedDomains: capabilities.enabledDomains });
          if (storageResult.ok && storageResult.state.revision > base.revision) {
            base = storageResult.state;
          }

          const candidate = mutate(base);
          if (!candidate) {
            finalState = base;
            return base;
          }

          const writeResult = writeCompareStorageWithRevision(
            candidate,
            base.revision,
            { allowedDomains: capabilities.enabledDomains }
          );
          if (writeResult.ok) {
            finalState = writeResult.state;
            if (retries > 0) {
              trackEvent("compare_conflict_recovered", {
                domain: writeResult.state.domain ?? "exoplanets",
                retries,
              });
            }
            return writeResult.state;
          }

          base = writeResult.currentState;
          retries += 1;
        }

        finalState = base;
        return base;
      });
      return finalState;
    },
    [capabilities.enabledDomains]
  );

  const addObject = useCallback(
    (object: AnyCosmicObject, source: CompareSource) => {
      const attemptedDomain = compareDomainFromObject(object);
      if (!attemptedDomain) {
        setStatusMessage("This object cannot be compared.");
        trackEvent("compare_action_result", {
          action: "add",
          result: "blocked",
          reason: "unsupported",
          mode: state.domain ?? "none",
          source,
        });
        return;
      }

      if (!enabledDomainSet.has(attemptedDomain)) {
        setPendingAdd(null);
        setStatusMessage(`${getCompareDomainLabel(attemptedDomain)} compare is currently disabled.`);
        trackEvent("compare_blocked_domain", {
          attemptedDomain,
          activeDomain: state.domain ?? "none",
          blockedReason: "mode-disabled",
          source,
        });
        trackEvent("compare_action_result", {
          action: "add",
          result: "blocked",
          reason: "mode-disabled",
          mode: state.domain ?? "none",
          source,
        });
        return;
      }

      const item = createCompareItem(object, inferSnapshotLevel(source));
      if (!item) {
        setPendingAdd(null);
        setStatusMessage("This object is missing required fields for compare.");
        trackEvent("compare_blocked_domain", {
          attemptedDomain,
          activeDomain: state.domain ?? "none",
          blockedReason: "unsupported",
          source,
        });
        trackEvent("compare_action_result", {
          action: "add",
          result: "blocked",
          reason: "unsupported",
          mode: state.domain ?? "none",
          source,
        });
        return;
      }

      let addRevision = state.revision;
      let addPosition = -1;
      let openedTray = false;
      let activeDomain: CompareDomain | "none" = state.domain ?? "none";
      let blockedReason: CompareBlockedReason | null = null;

      commitWithConflictRecovery((base) => {
        activeDomain = base.domain ?? "none";

        if (base.domain && base.domain !== item.domain) {
          blockedReason = "cross-domain";
          return null;
        }

        if (base.items.some((existing) => existing.id === item.id)) {
          blockedReason = "unsupported";
          setPendingAdd(null);
          setStatusMessage(`${item.displayName} is already in compare.`);
          return null;
        }

        if (base.items.length >= MAX_COMPARE_ITEMS) {
          blockedReason = "limit";
          setPendingAdd(null);
          setStatusMessage(
            `Compare is full. Remove one object before adding another (max ${MAX_COMPARE_ITEMS}).`
          );
          return null;
        }

        const nextItems = [...base.items, item];
        const nextState = nextRevisionState(base, nextItems);
        addRevision = nextState.revision;
        addPosition = nextItems.length;
        openedTray = base.items.length === 0;
        return nextState;
      });

      if (addPosition !== -1) {
        setPendingAdd(null);
        setStatusMessage(null);

        trackEvent("compare_add", {
          objectId: item.id,
          domain: item.domain,
          source,
          position: addPosition,
          revision: addRevision,
        });
        trackEvent("compare_action_result", {
          action: "add",
          result: "ok",
          mode: item.domain,
          source,
        });

        if (openedTray) {
          trackEvent("compare_tray_open", {
            domain: item.domain,
            source,
            itemCount: 1,
          });
        }
        return;
      }

      if (blockedReason === "cross-domain") {
        setPendingAdd({ object, source, attemptedDomain: item.domain });
        setStatusMessage(
          `Compare currently contains ${getCompareDomainLabel(activeDomain === "none" ? null : activeDomain)}. Clear compare to add ${getCompareDomainLabel(item.domain)}.`
        );

        trackEvent("compare_blocked_domain", {
          attemptedDomain: item.domain,
          activeDomain,
          blockedReason,
          source,
        });
        trackEvent("compare_action_result", {
          action: "add",
          result: "blocked",
          reason: blockedReason,
          mode: activeDomain,
          source,
        });
      } else if (blockedReason === "limit") {
        trackEvent("compare_action_result", {
          action: "add",
          result: "blocked",
          reason: "limit",
          mode: activeDomain,
          source,
        });
      } else if (blockedReason === "unsupported") {
        trackEvent("compare_action_result", {
          action: "add",
          result: "blocked",
          reason: "unsupported",
          mode: activeDomain,
          source,
        });
      }
    },
    [commitWithConflictRecovery, enabledDomainSet, state.domain, state.revision]
  );

  const removeObject = useCallback(
    (id: string, source: CompareSource) => {
      let removeRevision = state.revision;
      let removedDomain: CompareDomain | null = state.domain;
      let removed = false;
      commitWithConflictRecovery((base) => {
        const nextItems = base.items.filter((item) => item.id !== id);
        if (nextItems.length === base.items.length) {
          return null;
        }
        removed = true;
        removedDomain = base.domain;
        const nextState = nextRevisionState(base, nextItems);
        removeRevision = nextState.revision;
        return nextState;
      });

      if (removed) {
        setStatusMessage(null);
        setPendingAdd(null);
        trackEvent("compare_remove", {
          objectId: id,
          domain: removedDomain ?? "exoplanets",
          source,
          revision: removeRevision,
        });
        trackEvent("compare_action_result", {
          action: "remove",
          result: "ok",
          mode: removedDomain ?? "none",
          source,
        });
      }
    },
    [commitWithConflictRecovery, state.domain, state.revision]
  );

  const clear = useCallback(
    (source: CompareSource = "compare-tray") => {
      const count = state.items.length;
      const activeDomain = state.domain;
      commitWithConflictRecovery((base) => {
        if (base.items.length === 0) {
          return null;
        }
        return nextRevisionState(base, []);
      });

      if (count > 0) {
        setStatusMessage(null);
        setPendingAdd(null);
        trackEvent("compare_clear", {
          domain: activeDomain ?? "exoplanets",
          itemCount: count,
        });
        trackEvent("compare_action_result", {
          action: "clear",
          result: "ok",
          mode: activeDomain ?? "none",
          source,
        });
      }
    },
    [commitWithConflictRecovery, state.domain, state.items.length]
  );

  const clearAndRetryPendingAdd = useCallback(() => {
    if (!pendingAdd) return;

    const replacement = createCompareItem(pendingAdd.object, inferSnapshotLevel(pendingAdd.source));
    if (!replacement || !enabledDomainSet.has(replacement.domain)) {
      setPendingAdd(null);
      setStatusMessage("Unable to switch compare modes for this object.");
      return;
    }

    const previousCount = state.items.length;
    const previousDomain = state.domain;
    let addRevision = state.revision;

    commitWithConflictRecovery((base) => {
      const nextState = nextRevisionState(base, [replacement]);
      addRevision = nextState.revision;
      return nextState;
    });

    if (previousCount > 0) {
      trackEvent("compare_clear", {
        domain: previousDomain ?? replacement.domain,
        itemCount: previousCount,
      });
      trackEvent("compare_action_result", {
        action: "clear",
        result: "ok",
        mode: previousDomain ?? "none",
        source: "compare-tray",
      });
    }

    trackEvent("compare_add", {
      objectId: replacement.id,
      domain: replacement.domain,
      source: pendingAdd.source,
      position: 1,
      revision: addRevision,
    });
    trackEvent("compare_action_result", {
      action: "add",
      result: "ok",
      mode: replacement.domain,
      source: pendingAdd.source,
    });

    setPendingAdd(null);
    setStatusMessage(null);
  }, [commitWithConflictRecovery, enabledDomainSet, pendingAdd, state.domain, state.items.length, state.revision]);

  const cancelPendingAdd = useCallback(() => {
    setPendingAdd(null);
    setStatusMessage(null);
  }, []);

  const openExpanded = useCallback(() => {
    if (state.items.length === 0 || !state.domain) return;

    setIsExpanded(true);
    trackEvent("compare_dialog_open", {
      domain: state.domain,
      source: "compare-tray",
      itemCount: state.items.length,
    });
    trackEvent("compare_open", {
      domain: state.domain,
      itemCount: state.items.length,
    });
    trackEvent("compare_expand", {
      domain: state.domain,
      itemCount: state.items.length,
    });
  }, [state.domain, state.items.length]);

  const closeExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const dismissStatus = useCallback(() => {
    setStatusMessage(null);
    setPendingAdd(null);
  }, []);

  const isInCompare = useCallback(
    (id: string) => state.items.some((item) => item.id === id),
    [state.items]
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      state,
      isExpanded,
      statusMessage,
      statusCanClearAndContinue: Boolean(pendingAdd),
      addObject,
      removeObject,
      clear,
      clearAndRetryPendingAdd,
      cancelPendingAdd,
      openExpanded,
      closeExpanded,
      dismissStatus,
      isInCompare,
      isObjectSupported,
    }),
    [
      state,
      isExpanded,
      statusMessage,
      pendingAdd,
      addObject,
      removeObject,
      clear,
      clearAndRetryPendingAdd,
      cancelPendingAdd,
      openExpanded,
      closeExpanded,
      dismissStatus,
      isInCompare,
      isObjectSupported,
    ]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used inside CompareProvider");
  }
  return context;
}
