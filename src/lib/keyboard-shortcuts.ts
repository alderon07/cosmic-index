/**
 * Keyboard shortcuts definitions and utilities for Cosmic Index.
 *
 * Implements a GitHub-style navigation system with "g" prefix sequences
 * for navigating between sections, plus page-level action shortcuts.
 */

// Navigation routes for g-prefix shortcuts
export const NAVIGATION_ROUTES = {
  h: { path: "/", label: "Home" },
  e: { path: "/exoplanets", label: "Exoplanets" },
  s: { path: "/stars", label: "Stars" },
  b: { path: "/small-bodies", label: "Small Bodies" },
  c: { path: "/close-approaches", label: "Close Approaches" },
  f: { path: "/fireballs", label: "Fireballs" },
  w: { path: "/space-weather", label: "Space Weather" },
} as const;

export type NavigationKey = keyof typeof NAVIGATION_ROUTES;

// Global shortcuts that work on all pages
export interface GlobalShortcut {
  key: string;
  description: string;
  sequence?: string[]; // For multi-key shortcuts like g+h
}

export const GLOBAL_SHORTCUTS: GlobalShortcut[] = [
  { key: "g h", description: "Go to Home", sequence: ["g", "h"] },
  { key: "g e", description: "Go to Exoplanets", sequence: ["g", "e"] },
  { key: "g s", description: "Go to Stars", sequence: ["g", "s"] },
  { key: "g b", description: "Go to Small Bodies", sequence: ["g", "b"] },
  { key: "g c", description: "Go to Close Approaches", sequence: ["g", "c"] },
  { key: "g f", description: "Go to Fireballs", sequence: ["g", "f"] },
  { key: "g w", description: "Go to Space Weather", sequence: ["g", "w"] },
  { key: "?", description: "Open keyboard shortcuts help" },
  { key: "Escape", description: "Close dialog / Blur input" },
];

// Page action shortcuts
export interface PageShortcut {
  key: string;
  description: string;
  pages?: string[]; // Which pages this applies to (empty = all)
}

export const PAGE_SHORTCUTS: PageShortcut[] = [
  {
    key: "/",
    description: "Focus search bar",
    pages: ["exoplanets", "stars", "small-bodies"],
  },
  {
    key: "Ctrl+K",
    description: "Focus search bar",
    pages: ["exoplanets", "stars", "small-bodies"],
  },
  { key: "f", description: "Toggle filters panel" },
  { key: "v", description: "Toggle view (grid/list)" },
  { key: "j", description: "Next page", pages: ["exoplanets", "stars", "small-bodies"] },
  { key: "k", description: "Previous page", pages: ["exoplanets", "stars", "small-bodies"] },
];

/**
 * Check if the keyboard shortcut should be ignored based on the event target.
 * Returns true when focus is in an input, textarea, select, or contenteditable element.
 */
export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;

  // Always allow Escape to work
  if (event.key === "Escape") {
    return false;
  }

  // Check if target is an input, textarea, or select
  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  // Check for contenteditable
  if (target.isContentEditable) {
    return true;
  }

  // Check for Radix Select trigger (they use buttons but act as inputs)
  if (target.closest("[data-radix-select-trigger]")) {
    return true;
  }

  return false;
}

/**
 * Format a key for display in the shortcuts dialog.
 * Converts "Escape" to "Esc", handles modifier keys, etc.
 */
export function formatKeyForDisplay(key: string): string {
  const keyMap: Record<string, string> = {
    Escape: "Esc",
    " ": "Space",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
  };

  return keyMap[key] ?? key;
}

/**
 * Parse a shortcut string into individual keys.
 * "Ctrl+K" -> ["Ctrl", "K"]
 * "g h" -> ["g", "h"]
 */
export function parseShortcut(shortcut: string): string[] {
  if (shortcut.includes("+")) {
    return shortcut.split("+");
  }
  if (shortcut.includes(" ")) {
    return shortcut.split(" ");
  }
  return [shortcut];
}
