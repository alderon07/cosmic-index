"use client";

import { trackEvent } from "@/lib/analytics-events";

type PerfComponent = "compare-tray" | "object-visualizer" | "event-timeline";

interface PerfComponentState {
  samples: number[];
  degradeEnabled: boolean;
}

interface PerfStorageState {
  version: 1;
  components: Partial<Record<PerfComponent, PerfComponentState>>;
}

const PERF_STORAGE_KEY = "cosmic-index:perf:v1";
const MAX_SAMPLES = 300;
const WINDOW_SIZE = 100;
const REQUIRED_WINDOWS = 3;

const emptyState: PerfStorageState = {
  version: 1,
  components: {},
};

function readState(): PerfStorageState {
  if (typeof window === "undefined") {
    return emptyState;
  }

  const raw = window.sessionStorage.getItem(PERF_STORAGE_KEY);
  if (!raw) {
    return emptyState;
  }

  try {
    const parsed = JSON.parse(raw) as PerfStorageState;
    if (parsed.version !== 1 || !parsed.components) {
      return emptyState;
    }
    return parsed;
  } catch {
    return emptyState;
  }
}

function writeState(state: PerfStorageState): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PERF_STORAGE_KEY, JSON.stringify(state));
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

export function isDegradeModeEnabled(component: PerfComponent): boolean {
  const state = readState();
  return state.components[component]?.degradeEnabled ?? false;
}

export function recordPerformanceSample(params: {
  component: PerfComponent;
  metric: string;
  durationMs: number;
  budgetMs: number;
}): boolean {
  const { component, metric, durationMs, budgetMs } = params;
  const state = readState();
  const componentState: PerfComponentState = state.components[component] ?? {
    samples: [],
    degradeEnabled: false,
  };

  const samples = [...componentState.samples, durationMs].slice(-MAX_SAMPLES);
  const nextComponentState: PerfComponentState = {
    ...componentState,
    samples,
  };

  if (!nextComponentState.degradeEnabled && samples.length >= WINDOW_SIZE * REQUIRED_WINDOWS) {
    const windows: number[][] = [];
    for (let i = 0; i < REQUIRED_WINDOWS; i++) {
      const end = samples.length - i * WINDOW_SIZE;
      const start = end - WINDOW_SIZE;
      windows.push(samples.slice(start, end));
    }
    const allOverBudget = windows.every((windowSamples) => p95(windowSamples) > budgetMs);
    if (allOverBudget) {
      nextComponentState.degradeEnabled = true;
      trackEvent("perf_degrade_mode_enabled", {
        component,
        metric,
        p95Ms: p95(windows[0]),
        budgetMs,
      });
    }
  }

  const nextState: PerfStorageState = {
    ...state,
    components: {
      ...state.components,
      [component]: nextComponentState,
    },
  };
  writeState(nextState);

  return nextComponentState.degradeEnabled;
}
