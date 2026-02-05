"use client";

import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  theme?: {
    sortOrderBorder?: string;
    sortOrderSelected?: string;
  };
}

/**
 * A toggle component for switching between grid and list views.
 * Designed to be placed in the sort/filter controls section.
 */
export function ViewToggle({ view, onChange, theme }: ViewToggleProps) {
  const borderClass = theme?.sortOrderBorder ?? "border-border";
  const selectedClass = theme?.sortOrderSelected ?? "bg-primary/20 text-primary";

  return (
    <div
      className={`flex rounded-md border ${borderClass} overflow-hidden`}
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`p-1.5 transition-colors ${
          view === "grid"
            ? selectedClass
            : "bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
        }`}
        title="Grid view"
        aria-pressed={view === "grid"}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`p-1.5 transition-colors border-l ${borderClass} ${
          view === "list"
            ? selectedClass
            : "bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
        }`}
        title="List view"
        aria-pressed={view === "list"}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
