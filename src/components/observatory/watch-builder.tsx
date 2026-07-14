"use client";

import { useReducer, useState, type Dispatch, type ReactNode } from "react";
import { Activity, ArrowLeft, ArrowRight, Check, Orbit, ShieldAlert, Sun, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ObservatoryWatch } from "@/components/observatory/types";

type WatchDomain = "space_weather" | "close_approach";
type WeatherCategory = "flr" | "cme" | "gst" | "sep";
type Severity = "moderate" | "strong" | "severe";

export interface WatchBuilderState {
  step: 1 | 2 | 3;
  domain: WatchDomain | null;
  weatherCategory: WeatherCategory | "all";
  severity: Severity;
  maxDistanceLd: 1 | 3 | 5 | 10 | 20;
  leadTimeDays: 1 | 7 | 30;
  phaOnly: boolean;
  customName: string;
}

type WatchBuilderAction =
  | { type: "choose-domain"; domain: WatchDomain }
  | { type: "set-weather-category"; category: WeatherCategory | "all" }
  | { type: "set-severity"; severity: Severity }
  | { type: "set-distance"; distance: WatchBuilderState["maxDistanceLd"] }
  | { type: "set-lead-time"; days: WatchBuilderState["leadTimeDays"] }
  | { type: "set-pha-only"; value: boolean }
  | { type: "set-name"; name: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "reset"; state?: WatchBuilderState };

export function createInitialWatchBuilderState(): WatchBuilderState {
  return {
    step: 1,
    domain: null,
    weatherCategory: "all",
    severity: "strong",
    maxDistanceLd: 5,
    leadTimeDays: 7,
    phaOnly: false,
    customName: "",
  };
}

export function watchBuilderReducer(state: WatchBuilderState, action: WatchBuilderAction): WatchBuilderState {
  switch (action.type) {
    case "choose-domain":
      return { ...state, domain: action.domain };
    case "set-weather-category":
      return { ...state, weatherCategory: action.category };
    case "set-severity":
      return { ...state, severity: action.severity };
    case "set-distance":
      return { ...state, maxDistanceLd: action.distance };
    case "set-lead-time":
      return { ...state, leadTimeDays: action.days };
    case "set-pha-only":
      return { ...state, phaOnly: action.value };
    case "set-name":
      return { ...state, customName: action.name.slice(0, 80) };
    case "next":
      return { ...state, step: Math.min(3, state.step + 1) as 1 | 2 | 3 };
    case "back":
      return { ...state, step: Math.max(1, state.step - 1) as 1 | 2 | 3 };
    case "reset":
      return action.state ?? createInitialWatchBuilderState();
  }
}

const weatherLabels: Record<WeatherCategory | "all", string> = {
  all: "space weather",
  flr: "solar flares",
  cme: "solar eruptions",
  gst: "geomagnetic storms",
  sep: "particle events",
};

function autoName(state: WatchBuilderState): string {
  if (state.domain === "space_weather") {
    const severity = state.severity[0].toUpperCase() + state.severity.slice(1);
    return `${severity} ${weatherLabels[state.weatherCategory]}`;
  }
  return `${state.phaOnly ? "Hazardous passes" : "Close passes"} within ${state.maxDistanceLd} Moon ${state.maxDistanceLd === 1 ? "distance" : "distances"}`;
}

export function watchSummary(state: WatchBuilderState): string {
  if (state.domain === "space_weather") {
    return `Tell me when ${state.severity} or greater ${weatherLabels[state.weatherCategory]} are reported.`;
  }
  const hazardous = state.phaOnly ? " a potentially hazardous object" : " an object";
  return `Tell me when${hazardous} will pass within ${state.maxDistanceLd} Moon ${state.maxDistanceLd === 1 ? "distance" : "distances"} during the next ${state.leadTimeDays} ${state.leadTimeDays === 1 ? "day" : "days"}.`;
}

export function buildWatchPayload(state: WatchBuilderState) {
  const name = state.customName.trim() || autoName(state);
  if (state.domain === "space_weather") {
    return {
      name,
      alertType: "space_weather" as const,
      config: {
        schemaVersion: 1 as const,
        categories: state.weatherCategory === "all" ? ["flr", "cme", "gst", "sep"] : [state.weatherCategory],
        minimumSeverity: state.severity,
      },
    };
  }
  if (state.domain === "close_approach") {
    return {
      name,
      alertType: "close_approach" as const,
      config: {
        schemaVersion: 1 as const,
        maxDistanceLd: state.maxDistanceLd,
        leadTimeDays: state.leadTimeDays,
        phaOnly: state.phaOnly,
      },
    };
  }
  throw new Error("Choose what to watch first.");
}

export function watchToBuilderState(watch: ObservatoryWatch): WatchBuilderState {
  if (watch.alertType === "space_weather" && "categories" in watch.config) {
    const category = watch.config.categories.length === 1 && ["flr", "cme", "gst", "sep"].includes(watch.config.categories[0])
      ? watch.config.categories[0] as WeatherCategory
      : "all";
    return { ...createInitialWatchBuilderState(), step: 1, domain: "space_weather", weatherCategory: category, severity: watch.config.minimumSeverity, customName: watch.name };
  }
  if ("maxDistanceLd" in watch.config) {
    const distance = ([1, 3, 5, 10, 20] as number[]).includes(watch.config.maxDistanceLd) ? watch.config.maxDistanceLd as WatchBuilderState["maxDistanceLd"] : 5;
    const leadTime = ([1, 7, 30] as number[]).includes(watch.config.leadTimeDays) ? watch.config.leadTimeDays as WatchBuilderState["leadTimeDays"] : 7;
    return { ...createInitialWatchBuilderState(), step: 1, domain: "close_approach", maxDistanceLd: distance, leadTimeDays: leadTime, phaOnly: watch.config.phaOnly, customName: watch.name };
  }
  return createInitialWatchBuilderState();
}

function ChoiceButton({ selected, title, body, icon: Icon, onClick, accent = "orange", disabled = false }: {
  selected: boolean;
  title: string;
  body?: string;
  icon?: typeof Sun;
  onClick: () => void;
  accent?: "orange" | "violet" | "teal";
  disabled?: boolean;
}) {
  const tone = accent === "violet" ? "border-aurora-violet/55 bg-aurora-violet/10" : accent === "teal" ? "border-radium-teal/55 bg-radium-teal/10" : "border-reactor-orange/55 bg-reactor-orange/10";
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative min-h-14 w-full rounded-xl border p-4 text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light/40 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
        selected ? tone : "border-border/60 bg-black/15",
      )}
    >
      <span className="flex items-start gap-3">
        {Icon ? <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-current/20 bg-black/15"><Icon aria-hidden="true" className="size-5" /></span> : null}
        <span>
          <span className="flex items-center gap-2 font-display text-sm text-foreground">{title}{selected ? <Check aria-hidden="true" className="size-4" /> : null}</span>
          {body ? <span className="mt-1 block text-sm leading-5 text-muted-foreground">{body}</span> : null}
        </span>
      </span>
    </button>
  );
}

export function WatchBuilderForm({ state, dispatch, onSubmit, isSubmitting, error, submitLabel, lockDomain = false }: {
  state: WatchBuilderState;
  dispatch: Dispatch<WatchBuilderAction>;
  onSubmit: () => void;
  isSubmitting: boolean;
  error?: string | null;
  submitLabel?: string;
  lockDomain?: boolean;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2" aria-label={`Step ${state.step} of 3`}>
        {[1, 2, 3].map((step) => <span key={step} className={cn("h-1.5 flex-1 rounded-full", step <= state.step ? "bg-reactor-orange" : "bg-border")} />)}
      </div>

      {state.step === 1 ? (
        <fieldset>
          <legend className="font-display text-lg text-orange-100">What should we watch?</legend>
          <p className="mt-2 text-sm text-muted-foreground">Pick one. You can change it before saving.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ChoiceButton disabled={lockDomain && state.domain !== "space_weather"} selected={state.domain === "space_weather"} title="Space weather" body="Storms and activity from the Sun" icon={Sun} accent="violet" onClick={() => dispatch({ type: "choose-domain", domain: "space_weather" })} />
            <ChoiceButton disabled={lockDomain && state.domain !== "close_approach"} selected={state.domain === "close_approach"} title="Close approaches" body="Space rocks passing near Earth" icon={Orbit} accent="teal" onClick={() => dispatch({ type: "choose-domain", domain: "close_approach" })} />
          </div>
        </fieldset>
      ) : null}

      {state.step === 2 && state.domain === "space_weather" ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="font-display text-base text-orange-100">Which kind?</legend>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["all", "flr", "cme", "gst", "sep"] as const).map((category) => (
                <ChoiceButton key={category} selected={state.weatherCategory === category} title={category === "all" ? "Everything" : weatherLabels[category][0].toUpperCase() + weatherLabels[category].slice(1)} onClick={() => dispatch({ type: "set-weather-category", category })} accent="violet" />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-display text-base text-orange-100">How big should it be?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(["moderate", "strong", "severe"] as const).map((severity) => <ChoiceButton key={severity} selected={state.severity === severity} title={`${severity[0].toUpperCase()}${severity.slice(1)} or bigger`} onClick={() => dispatch({ type: "set-severity", severity })} accent="violet" />)}
            </div>
          </fieldset>
        </div>
      ) : null}

      {state.step === 2 && state.domain === "close_approach" ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="font-display text-base text-orange-100">How close?</legend>
            <p className="mt-1 text-sm text-muted-foreground">One Moon distance is the gap from Earth to the Moon.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {([1, 3, 5, 10, 20] as const).map((distance) => <ChoiceButton key={distance} selected={state.maxDistanceLd === distance} title={`${distance} Moon`} onClick={() => dispatch({ type: "set-distance", distance })} accent="teal" />)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-display text-base text-orange-100">How early?</legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([1, 7, 30] as const).map((days) => <ChoiceButton key={days} selected={state.leadTimeDays === days} title={`${days} ${days === 1 ? "day" : "days"}`} onClick={() => dispatch({ type: "set-lead-time", days })} accent="teal" />)}
            </div>
          </fieldset>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-black/15 p-3 text-sm">
            <Checkbox checked={state.phaOnly} onChange={(event) => dispatch({ type: "set-pha-only", value: event.currentTarget.checked })} />
            <span><span className="flex items-center gap-2 font-medium"><ShieldAlert aria-hidden="true" className="size-4 text-destructive" /> Potentially hazardous only</span><span className="mt-1 block text-xs text-muted-foreground">Only objects NASA marks for extra attention.</span></span>
          </label>
        </div>
      ) : null}

      {state.step === 3 ? (
        <div>
          <p className="font-display text-lg text-orange-100">Does this look right?</p>
          <div className="mt-4 rounded-xl border border-reactor-orange/30 bg-reactor-orange/5 p-5 scanlines">
            <Activity aria-hidden="true" className="mb-3 size-6 text-reactor-orange" />
            <p className="relative z-20 text-base leading-7 text-foreground">{watchSummary(state)}</p>
          </div>
          <label htmlFor="watch-name" className="mt-5 block text-sm font-medium text-foreground">Name this watch <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Input id="watch-name" maxLength={80} value={state.customName} onChange={(event) => dispatch({ type: "set-name", name: event.currentTarget.value })} placeholder={autoName(state)} className="mt-2 min-h-11 w-full" />
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {state.step > 1 ? <Button type="button" variant="outline" size="lg" onClick={() => dispatch({ type: "back" })}><ArrowLeft /> Back</Button> : <span />}
        {state.step < 3 ? <Button type="button" size="lg" disabled={state.step === 1 && state.domain === null} onClick={() => dispatch({ type: "next" })}>Next <ArrowRight /></Button> : <Button type="button" size="lg" disabled={isSubmitting} onClick={onSubmit}>{isSubmitting ? "Saving…" : submitLabel ?? "Start watching"}<Waves /></Button>}
      </div>
    </div>
  );
}

export function WatchBuilder({ trigger, onCreate, disabled = false, initialState, title = "Make a watch", submitLabel = "Start watching" }: {
  trigger: ReactNode;
  onCreate: (payload: ReturnType<typeof buildWatchPayload>) => Promise<void>;
  disabled?: boolean;
  initialState?: WatchBuilderState;
  title?: string;
  submitLabel?: string;
}) {
  const [state, dispatch] = useReducer(watchBuilderReducer, initialState, (value) => value ?? createInitialWatchBuilderState());
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(buildWatchPayload(state));
      setOpen(false);
      dispatch({ type: "reset", state: initialState });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "That watch could not be started.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}>
      <DialogTrigger asChild disabled={disabled}>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-reactor-orange/25 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-orange-100">{title}</DialogTitle>
          <DialogDescription>Three small steps. We will explain each one.</DialogDescription>
        </DialogHeader>
        <WatchBuilderForm state={state} dispatch={dispatch} onSubmit={submit} isSubmitting={isSubmitting} error={error} submitLabel={submitLabel} lockDomain={initialState !== undefined} />
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
