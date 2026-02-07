"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompareChip } from "@/components/compare/compare-chip";
import { CompareTable } from "@/components/compare/compare-table";
import { useCompare } from "@/components/compare/use-compare";
import { recordPerformanceSample, isDegradeModeEnabled } from "@/lib/performance-mode";
import { Telescope, X } from "lucide-react";

const COMPARE_TRAY_BUDGET_MS = 100;

export function CompareTray() {
  const {
    state,
    isExpanded,
    statusMessage,
    removeObject,
    clear,
    openExpanded,
    closeExpanded,
    dismissStatus,
  } = useCompare();

  const shouldRender = state.items.length > 0 || Boolean(statusMessage);
  const degradeMode = isDegradeModeEnabled("compare-tray");

  const handleClearAndClose = () => {
    clear();
    closeExpanded();
  };

  useEffect(() => {
    if (!isExpanded) return;
    const start = performance.now();
    requestAnimationFrame(() => {
      recordPerformanceSample({
        component: "compare-tray",
        metric: "open",
        durationMs: performance.now() - start,
        budgetMs: COMPARE_TRAY_BUDGET_MS,
      });
    });
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && state.items.length === 0) {
      closeExpanded();
    }
  }, [closeExpanded, isExpanded, state.items.length]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4">
        <div
          className={`mx-auto max-w-6xl rounded-xl border border-primary/40 bg-card/95 backdrop-blur-md shadow-lg ${
            degradeMode ? "" : "scanlines"
          }`}
        >
          <div className="p-3 sm:p-4">
            {statusMessage ? (
              <div
                className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm text-primary">{statusMessage}</p>
                <button
                  type="button"
                  onClick={dismissStatus}
                  className="text-primary/80 hover:text-primary"
                  aria-label="Dismiss compare status"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {state.items.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary">
                    <Telescope className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-sm text-primary">
                      Exoplanet Compare
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {state.items.length} of 3 selected
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-wrap gap-2">
                  {state.items.map((item) => (
                    <CompareChip
                      key={item.id}
                      item={item}
                      onRemove={() => removeObject(item.id, "compare-tray")}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button variant="outline" size="sm" onClick={clear}>
                    Clear
                  </Button>
                  <Button size="sm" className="glow-orange" onClick={openExpanded}>
                    Open Compare
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={(open) => !open && closeExpanded()}>
        <DialogContent className="h-[90vh] w-[calc(100vw-1.5rem)] md:w-[95vw] md:max-w-[95vw] lg:max-w-[92vw] xl:max-w-[90vw] overflow-hidden bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Compare Exoplanets
            </DialogTitle>
            <DialogDescription>
              Side-by-side instrument view for selected exoplanets.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto space-y-4">
            {state.items.length > 0 ? (
              <CompareTable items={state.items} />
            ) : (
              <div className="rounded-lg border border-border/50 bg-muted/20 p-6 text-center">
                <p className="font-display text-lg text-foreground">
                  Compare tray is empty
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add exoplanets from cards or detail pages to compare them side-by-side.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClearAndClose}>
              Clear Compare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
