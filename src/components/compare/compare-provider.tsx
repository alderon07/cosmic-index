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
  CompareItem,
  CompareStateV1,
  MAX_COMPARE_ITEMS,
  compareDomainFromObject,
  createCompareItem,
  emptyCompareState,
} from "@/lib/compare-facts";
import {
  clearCompareStorage,
  readCompareStorage,
  writeCompareStorageWithRevision,
} from "@/lib/compare-storage";
import { AnyCosmicObject } from "@/lib/types";
import { CompareSource, trackEvent } from "@/lib/analytics-events";

interface CompareContextValue {
  state: CompareStateV1;
  isExpanded: boolean;
  statusMessage: string | null;
  addObject: (object: AnyCosmicObject, source: CompareSource) => void;
  removeObject: (id: string, source: CompareSource) => void;
  clear: () => void;
  openExpanded: () => void;
  closeExpanded: () => void;
  dismissStatus: () => void;
  isInCompare: (id: string) => boolean;
  isObjectSupported: (object: AnyCosmicObject) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function nextRevisionState(base: CompareStateV1, nextItems: CompareItem[]): CompareStateV1 {
  return {
    ...base,
    items: nextItems,
    domain: nextItems.length > 0 ? "exoplanets" : null,
    revision: base.revision + 1,
    updatedAt: Date.now(),
  };
}

interface CompareProviderProps {
  children: React.ReactNode;
}

export function CompareProvider({ children }: CompareProviderProps) {
  const [state, setState] = useState<CompareStateV1>(() => emptyCompareState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const result = readCompareStorage();
    if (result.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(result.state);
      return;
    }

    clearCompareStorage();
    setStatusMessage("Couldn't restore previous comparison. Started fresh.");
    trackEvent("compare_restore_failed", { reason: result.reason });
  }, []);

  const isObjectSupported = useCallback((object: AnyCosmicObject) => {
    return compareDomainFromObject(object) === "exoplanets";
  }, []);

  const commitWithConflictRecovery = useCallback(
    (mutate: (base: CompareStateV1) => CompareStateV1 | null) => {
      let finalState: CompareStateV1 | null = null;
      let retries = 0;
      setState((prev) => {
        let base = prev;
        while (retries < 3) {
          const storageResult = readCompareStorage();
          if (storageResult.ok && storageResult.state.revision > base.revision) {
            base = storageResult.state;
          }

          const candidate = mutate(base);
          if (!candidate) {
            finalState = base;
            return base;
          }

          const writeResult = writeCompareStorageWithRevision(candidate, base.revision);
          if (writeResult.ok) {
            finalState = writeResult.state;
            if (retries > 0) {
              trackEvent("compare_conflict_recovered", {
                domain: "exoplanets",
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
    []
  );

  const addObject = useCallback(
    (object: AnyCosmicObject, source: CompareSource) => {
      if (!isObjectSupported(object)) {
        const attemptedDomain = object.type === "STAR" ? "stars" : "small-bodies";
        trackEvent("compare_blocked_domain", {
          attemptedDomain,
          activeDomain: state.domain ?? "none",
          source,
        });
        setStatusMessage(
          "Compare is currently limited to exoplanets while we validate the feature."
        );
        return;
      }

      const item = createCompareItem(object);
      if (!item) {
        return;
      }

      let addRevision = state.revision;
      let addPosition = -1;
      let addedId = "";
      commitWithConflictRecovery((base) => {
        if (base.items.some((existing) => existing.id === item.id)) {
          setStatusMessage(`${item.displayName} is already in compare.`);
          return null;
        }
        if (base.items.length >= MAX_COMPARE_ITEMS) {
          setStatusMessage(
            `Compare is full. Remove one object before adding another (max ${MAX_COMPARE_ITEMS}).`
          );
          return null;
        }

        const nextItems = [...base.items, item];
        const nextState = nextRevisionState(base, nextItems);
        addRevision = nextState.revision;
        addPosition = nextItems.length;
        addedId = item.id;
        return nextState;
      });

      if (addPosition !== -1) {
        setStatusMessage(null);
        trackEvent("compare_add", {
          objectId: addedId,
          domain: "exoplanets",
          source,
          position: addPosition,
          revision: addRevision,
        });
      }
    },
    [commitWithConflictRecovery, isObjectSupported, state.domain, state.revision]
  );

  const removeObject = useCallback(
    (id: string, source: CompareSource) => {
      let removeRevision = state.revision;
      let removed = false;
      commitWithConflictRecovery((base) => {
        const nextItems = base.items.filter((item) => item.id !== id);
        if (nextItems.length === base.items.length) {
          return null;
        }
        removed = true;
        const nextState = nextRevisionState(base, nextItems);
        removeRevision = nextState.revision;
        return nextState;
      });

      if (removed) {
        setStatusMessage(null);
        trackEvent("compare_remove", {
          objectId: id,
          domain: "exoplanets",
          source,
          revision: removeRevision,
        });
      }
    },
    [commitWithConflictRecovery, state.revision]
  );

  const clear = useCallback(() => {
    const count = state.items.length;
    commitWithConflictRecovery((base) => {
      if (base.items.length === 0) {
        return null;
      }
      return nextRevisionState(base, []);
    });
    if (count > 0) {
      setStatusMessage(null);
      trackEvent("compare_clear", { domain: "exoplanets", itemCount: count });
    }
  }, [commitWithConflictRecovery, state.items.length]);

  const openExpanded = useCallback(() => {
    if (state.items.length === 0) return;
    setIsExpanded(true);
    trackEvent("compare_open", {
      domain: "exoplanets",
      itemCount: state.items.length,
    });
    trackEvent("compare_expand", {
      domain: "exoplanets",
      itemCount: state.items.length,
    });
  }, [state.items.length]);

  const closeExpanded = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const dismissStatus = useCallback(() => {
    setStatusMessage(null);
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
      addObject,
      removeObject,
      clear,
      openExpanded,
      closeExpanded,
      dismissStatus,
      isInCompare,
      isObjectSupported,
    }),
    [
      addObject,
      clear,
      closeExpanded,
      dismissStatus,
      isExpanded,
      isInCompare,
      isObjectSupported,
      openExpanded,
      removeObject,
      state,
      statusMessage,
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
