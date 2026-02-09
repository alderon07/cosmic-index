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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompareChip } from "@/components/compare/compare-chip";
import { CompareTable } from "@/components/compare/compare-table";
import { useCompare } from "@/components/compare/use-compare";
import { recordPerformanceSample, isDegradeModeEnabled } from "@/lib/performance-mode";
import { getCompareDomainLabel, MAX_COMPARE_ITEMS } from "@/lib/compare-facts";
import { cn } from "@/lib/utils";
import { Telescope, X, PanelBottomOpen } from "lucide-react";

const COMPARE_TRAY_BUDGET_MS = 100;

export function CompareTray() {
  const {
    state,
    isExpanded,
    statusMessage,
    statusCanClearAndContinue,
    removeObject,
    clear,
    clearAndRetryPendingAdd,
    cancelPendingAdd,
    openExpanded,
    closeExpanded,
    dismissStatus,
  } = useCompare();

  const shouldRender = state.items.length > 0 || Boolean(statusMessage);
  const degradeMode = isDegradeModeEnabled("compare-tray");
  const domainLabel = getCompareDomainLabel(state.domain);
  const trayToneClass =
    state.domain === "stars"
      ? {
          panelBorder: "border-uranium-green/40",
          icon: "bg-uranium-green/20 text-uranium-green",
          title: "text-uranium-green",
          status: "border-uranium-green/40 bg-uranium-green/10",
          statusText: "text-uranium-green",
          statusDismiss: "text-uranium-green/80 hover:text-uranium-green",
          action: "border-uranium-green/45 bg-uranium-green/12 text-uranium-green hover:bg-uranium-green/18",
          dialogBorder: "border-uranium-green/40",
          dialogTitle: "text-uranium-green",
          dialogDescription: "text-uranium-green/75",
          emptyState: "border-uranium-green/35 bg-uranium-green/8",
        }
      : state.domain === "small-bodies"
      ? {
          panelBorder: "border-secondary/40",
          icon: "bg-secondary/20 text-secondary",
          title: "text-secondary",
          status: "border-secondary/40 bg-secondary/10",
          statusText: "text-secondary",
          statusDismiss: "text-secondary/80 hover:text-secondary",
          action: "border-secondary/45 bg-secondary/12 text-secondary hover:bg-secondary/18",
          dialogBorder: "border-secondary/40",
          dialogTitle: "text-secondary",
          dialogDescription: "text-secondary/75",
          emptyState: "border-secondary/35 bg-secondary/8",
        }
      : {
          panelBorder: "border-primary/40",
          icon: "bg-primary/20 text-primary",
          title: "text-primary",
          status: "border-primary/40 bg-primary/10",
          statusText: "text-primary",
          statusDismiss: "text-primary/80 hover:text-primary",
          action: "border-primary/45 bg-primary/12 text-primary hover:bg-primary/18",
          dialogBorder: "border-primary/40",
          dialogTitle: "text-primary",
          dialogDescription: "text-primary/75",
          emptyState: "border-primary/35 bg-primary/8",
        };

  const handleClearAndClose = () => {
    clear("compare-table");
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
          className={`mx-auto max-w-6xl rounded-xl border ${trayToneClass.panelBorder} bg-card/95 backdrop-blur-md shadow-lg ${
            degradeMode ? "" : "scanlines"
          }`}
        >
          <div className="p-3 sm:p-4">
            {statusMessage ? (
              <div
                className={cn("mb-3 rounded-lg border px-3 py-2", trayToneClass.status)}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-sm", trayToneClass.statusText)}>{statusMessage}</p>
                  <button
                    type="button"
                    onClick={dismissStatus}
                    className={trayToneClass.statusDismiss}
                    aria-label="Dismiss compare status"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {statusCanClearAndContinue && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn("h-7 px-2.5 border", trayToneClass.action)}
                      onClick={clearAndRetryPendingAdd}
                    >
                      Clear and Continue
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn("h-7 px-2.5 border", trayToneClass.action)}
                      onClick={cancelPendingAdd}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {state.items.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={cn(
                      "hidden sm:flex h-8 w-8 items-center justify-center rounded-md",
                      trayToneClass.icon
                    )}
                  >
                    <Telescope className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("font-display text-sm", trayToneClass.title)}>{domainLabel} Compare</p>
                    <p className="text-xs text-muted-foreground">
                      {state.items.length} selected (max {MAX_COMPARE_ITEMS})
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
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("border", trayToneClass.action)}
                    onClick={() => clear("compare-tray")}
                  >
                    Clear
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className={cn("border", trayToneClass.action)}
                        onClick={openExpanded}
                        aria-label="Open compare panel"
                      >
                        <PanelBottomOpen className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open compare panel</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={isExpanded} onOpenChange={(open) => !open && closeExpanded()}>
        <DialogContent
          className={cn(
            "h-[84vh] w-[calc(100vw-1.5rem)] md:w-[95vw] md:max-w-[95vw] lg:max-w-[92vw] xl:max-w-[90vw] overflow-hidden bg-background grid-rows-[auto_minmax(0,1fr)_auto]",
            trayToneClass.dialogBorder
          )}
        >
          <DialogHeader>
            <DialogTitle className={cn("font-display text-2xl", trayToneClass.dialogTitle)}>
              Compare {domainLabel}
            </DialogTitle>
            <DialogDescription className={trayToneClass.dialogDescription}>
              Side-by-side instrument view for selected objects (up to {MAX_COMPARE_ITEMS}).
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto space-y-4">
            {state.items.length > 0 ? (
              <CompareTable items={state.items} />
            ) : (
              <div className={cn("rounded-lg border p-6 text-center", trayToneClass.emptyState)}>
                <p className="font-display text-lg text-foreground">
                  Compare tray is empty
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add objects from cards or detail pages to compare them side-by-side.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 justify-end sm:justify-end">
            <Button
              variant="outline"
              className={cn("border", trayToneClass.action)}
              onClick={handleClearAndClose}
            >
              Clear Compare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
