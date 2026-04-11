"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Download, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { ThemeConfig, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ExportCategory = "exoplanets" | "stars" | "small-bodies" | "saved-objects";
type ExportFormat = "csv" | "json" | "ndjson";
type ExportProfile = "basic" | "research";
type ExportLayout = "wide" | "relational";
type SavedObjectTypeFilter = "all" | "exoplanet" | "star" | "small-body" | "cme" | "flr" | "gst" | "fireball";
type SavedObjectPayloadFilter = "any" | "with-event" | "without-event";

interface ExportButtonProps {
  category: ExportCategory;
  theme?: ThemeConfig;
  queryParams?: Record<string, unknown>;
  fileLabel?: string;
}

interface ThemedDatePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme: ThemeConfig;
}

const PROFILE_DESCRIPTIONS: Record<
  ExportCategory,
  Record<ExportProfile, string>
> = {
  exoplanets: {
    basic: "Readable planet facts for quick review, spreadsheets, and sharing.",
    research:
      "Expanded planetary and host-star measurements for deeper analysis.",
  },
  stars: {
    basic: "Core host-star attributes for sorting, comparison, and reporting.",
    research:
      "Adds stellar structure, magnitudes, metallicity, age, and coordinates.",
  },
  "small-bodies": {
    basic:
      "Quick triage fields for names, hazard flags, orbit class, size, and discovery year.",
    research:
      "Adds designations, aliases, JPL identifiers, and richer archival metadata.",
  },
  "saved-objects": {
    basic:
      "Compact saved-item rows with user-facing catalog context and direct links.",
    research:
      "Full saved-item enrichment with domain-specific metrics and event details.",
  },
};

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function ThemedDatePicker({ label, value, onChange, theme }: ThemedDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const calendarStart = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let day = calendarStart; day <= calendarEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  return (
    <div ref={rootRef} className="relative grid gap-1">
      <span className="text-xs font-medium">{label}</span>
      <Button
        type="button"
        variant="outline"
        className={cn("h-8 w-full justify-start text-xs font-mono", theme.sortSelect)}
        onClick={() => {
          if (!open && selectedDate) {
            setDisplayMonth(selectedDate);
          }
          setOpen((prev) => !prev);
        }}
      >
        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Select date"}
      </Button>
      {open && (
        <Card tone="neutral" className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[280px] gap-3 rounded-lg border border-orange-300/30 bg-[#18110d]/95 py-3 shadow-xl">
          <CardContent className="px-3">
            <div className="mb-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDisplayMonth((month) => subMonths(month, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-medium">{format(displayMonth, "MMMM yyyy")}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDisplayMonth((month) => addMonths(month, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
                <span key={dayName}>{dayName}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const inMonth = isSameMonth(day, displayMonth);
                const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                return (
                  <Button
                    key={day.toISOString()}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 p-0 text-xs",
                      !inMonth && "text-muted-foreground/45",
                      selected && "bg-orange-500 text-black hover:bg-orange-400"
                    )}
                    onClick={() => {
                      onChange(formatDateValue(day));
                      setOpen(false);
                    }}
                  >
                    {format(day, "d")}
                  </Button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const today = new Date();
                  onChange(formatDateValue(today));
                  setDisplayMonth(today);
                  setOpen(false);
                }}
              >
                Today
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ExportButton({
  category,
  theme = THEMES.exoplanets,
  queryParams,
  fileLabel,
}: ExportButtonProps) {
  const auth = useAppAuth();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [profile, setProfile] = useState<ExportProfile>("basic");
  const [layout, setLayout] = useState<ExportLayout>("wide");
  const [includeRawPayload, setIncludeRawPayload] = useState(false);
  const [objectTypeFilter, setObjectTypeFilter] = useState<SavedObjectTypeFilter>("all");
  const [payloadFilter, setPayloadFilter] = useState<SavedObjectPayloadFilter>("any");
  const [savedAfter, setSavedAfter] = useState("");
  const [savedBefore, setSavedBefore] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const showSavedObjectControls = category === "saved-objects";
  const profileDescription = PROFILE_DESCRIPTIONS[category][profile];
  const layoutDescription =
    layout === "wide"
      ? "One row per saved object."
      : "Relational tables (saved_objects + saved_events). CSV downloads as ZIP.";
  const formatDescription =
    format === "json"
      ? "Single structured document."
      : format === "ndjson"
      ? "Line-delimited JSON for scripts and streaming."
      : "Spreadsheet-friendly tabular export.";

  if (!auth.isSignedIn) {
    return null;
  }

  const handleExport = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setExportError(null);
    try {
      const requestQueryParams = {
        ...(queryParams ?? {}),
        ...(showSavedObjectControls && objectTypeFilter !== "all"
          ? { objectType: objectTypeFilter }
          : {}),
        ...(showSavedObjectControls && payloadFilter !== "any"
          ? { hasEventPayload: payloadFilter === "with-event" }
          : {}),
        ...(showSavedObjectControls && savedAfter
          ? { savedAfter: `${savedAfter}T00:00:00.000Z` }
          : {}),
        ...(showSavedObjectControls && savedBefore
          ? { savedBefore: `${savedBefore}T23:59:59.999Z` }
          : {}),
      };

      const response = await fetch("/api/user/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          profile,
          layout: showSavedObjectControls ? layout : undefined,
          includeRawPayload: showSavedObjectControls ? includeRawPayload : undefined,
          category,
          queryParams: requestQueryParams,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const message =
          response.status === 403
            ? "Export is a Pro feature."
            : body?.error ?? `Export failed (${response.status})`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      const safeLabel = (fileLabel ?? category).toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename=\"?([^\";]+)\"?/i);
      const serverFilename = filenameMatch?.[1];
      link.href = href;
      link.download = serverFilename ?? `cosmic-index-${safeLabel}-${date}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      console.error("Export failed", error);
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-wrap items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-8 gap-1.5 whitespace-nowrap", theme.sortSelect, theme.text)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Export Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Export Settings</DialogTitle>
              <DialogDescription>
                Choose the export profile, structure, and filters. Settings only apply to this export action.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Card tone="neutral" className="gap-3 py-4">
                <CardHeader className="px-4 pb-0">
                  <CardTitle className="text-sm">Format and Profile</CardTitle>
                  <CardDescription className="text-xs">
                    Pick file format and field depth for the next download.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 px-4">
                  <div className="grid gap-1">
                    <span className="text-xs font-medium">Profile</span>
                    <Select value={profile} onValueChange={(value) => setProfile(value as ExportProfile)}>
                      <SelectTrigger className={cn("h-8 w-full text-xs font-mono", theme.sortSelect)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic" className={theme.selectItemFocus}>
                          Basic
                        </SelectItem>
                        <SelectItem value="research" className={theme.selectItemFocus}>
                          Research
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-muted-foreground">{profileDescription}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-medium">Format</span>
                    <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                      <SelectTrigger className={cn("h-8 w-full text-xs font-mono", theme.sortSelect)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv" className={theme.selectItemFocus}>
                          CSV
                        </SelectItem>
                        <SelectItem value="json" className={theme.selectItemFocus}>
                          JSON
                        </SelectItem>
                        <SelectItem value="ndjson" className={theme.selectItemFocus}>
                          NDJSON
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[11px] text-muted-foreground">{formatDescription}</span>
                  </div>
                </CardContent>
              </Card>

              {showSavedObjectControls && (
                <Card tone="neutral" className="gap-3 py-4">
                  <CardHeader className="px-4 pb-0">
                    <CardTitle className="text-sm">Saved Object Options</CardTitle>
                    <CardDescription className="text-xs">
                      Tune saved-object shape and filtering for research and hobby workflows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 px-4">
                    <div className="grid gap-1">
                      <span className="text-xs font-medium">Layout</span>
                      <Select value={layout} onValueChange={(value) => setLayout(value as ExportLayout)}>
                        <SelectTrigger className={cn("h-8 w-full text-xs font-mono", theme.sortSelect)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wide" className={theme.selectItemFocus}>
                            Wide
                          </SelectItem>
                          <SelectItem value="relational" className={theme.selectItemFocus}>
                            Relational
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[11px] text-muted-foreground">{layoutDescription}</span>
                    </div>

                    {profile === "research" && (
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={includeRawPayload}
                          onChange={(event) => setIncludeRawPayload(event.currentTarget.checked)}
                        />
                        Include raw payload JSON for event rows
                      </label>
                    )}

                    <div className="grid gap-1">
                      <span className="text-xs font-medium">Object Type Filter</span>
                      <Select value={objectTypeFilter} onValueChange={(value) => setObjectTypeFilter(value as SavedObjectTypeFilter)}>
                        <SelectTrigger className={cn("h-8 w-full text-xs font-mono", theme.sortSelect)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className={theme.selectItemFocus}>All Types</SelectItem>
                          <SelectItem value="exoplanet" className={theme.selectItemFocus}>Exoplanet</SelectItem>
                          <SelectItem value="star" className={theme.selectItemFocus}>Star</SelectItem>
                          <SelectItem value="small-body" className={theme.selectItemFocus}>Small Body</SelectItem>
                          <SelectItem value="cme" className={theme.selectItemFocus}>CME</SelectItem>
                          <SelectItem value="flr" className={theme.selectItemFocus}>FLR</SelectItem>
                          <SelectItem value="gst" className={theme.selectItemFocus}>GST</SelectItem>
                          <SelectItem value="fireball" className={theme.selectItemFocus}>Fireball</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1">
                      <span className="text-xs font-medium">Payload Filter</span>
                      <Select value={payloadFilter} onValueChange={(value) => setPayloadFilter(value as SavedObjectPayloadFilter)}>
                        <SelectTrigger className={cn("h-8 w-full text-xs font-mono", theme.sortSelect)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any" className={theme.selectItemFocus}>Any Payload</SelectItem>
                          <SelectItem value="with-event" className={theme.selectItemFocus}>With Event</SelectItem>
                          <SelectItem value="without-event" className={theme.selectItemFocus}>Without Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <ThemedDatePicker
                        label="Saved After (UTC)"
                        value={savedAfter}
                        onChange={setSavedAfter}
                        theme={theme}
                      />
                      <ThemedDatePicker
                        label="Saved Before (UTC)"
                        value={savedBefore}
                        onChange={setSavedBefore}
                        theme={theme}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("h-8 gap-1.5 whitespace-nowrap", theme.sortSelect, theme.text)}
          onClick={() => {
            void handleExport();
          }}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export
        </Button>
        {exportError ? (
          <p className="absolute right-0 top-full mt-1 text-xs text-destructive" role="status">
            {exportError}{" "}
            {exportError.includes("Pro feature") ? (
              <a href="/settings/billing" className="underline underline-offset-2">
                Open Billing
              </a>
            ) : null}
          </p>
        ) : null}
    </div>
  );
}
