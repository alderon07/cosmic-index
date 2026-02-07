"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  shouldIgnoreShortcut,
  NAVIGATION_ROUTES,
  NavigationKey,
} from "@/lib/keyboard-shortcuts";

// Timeout for g-prefix sequences (ms)
const SEQUENCE_TIMEOUT = 1500;

// Shared global listener registry so provider + page hooks don't each add document listeners.
const shortcutSubscribers = new Set<(event: KeyboardEvent) => void>();
let isGlobalListenerAttached = false;

function dispatchKeyboardEvent(event: KeyboardEvent) {
  for (const subscriber of shortcutSubscribers) {
    subscriber(event);
  }
}

function ensureGlobalKeyboardListener() {
  if (isGlobalListenerAttached || typeof document === "undefined") {
    return;
  }
  document.addEventListener("keydown", dispatchKeyboardEvent);
  isGlobalListenerAttached = true;
}

function teardownGlobalKeyboardListenerIfIdle() {
  if (!isGlobalListenerAttached || shortcutSubscribers.size > 0 || typeof document === "undefined") {
    return;
  }
  document.removeEventListener("keydown", dispatchKeyboardEvent);
  isGlobalListenerAttached = false;
}

export interface ShortcutHandler {
  key: string;
  handler: () => void;
  description?: string;
}

export interface UseKeyboardShortcutsOptions {
  /** Page-specific shortcuts */
  shortcuts?: ShortcutHandler[];
  /** Callback when help dialog should open */
  onOpenHelp?: () => void;
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts.
 *
 * Provides:
 * - Global navigation with g-prefix (g+h for home, g+e for exoplanets, etc.)
 * - Help dialog trigger (?)
 * - Escape key handling (blur inputs, close dialogs)
 * - Page-specific shortcuts passed via options
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { shortcuts = [], onOpenHelp, enabled = true } = options;
  const router = useRouter();

  // Track g-prefix state
  const gPrefixActive = useRef(false);
  const gPrefixTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear g-prefix state
  const clearGPrefix = useCallback(() => {
    gPrefixActive.current = false;
    if (gPrefixTimeout.current) {
      clearTimeout(gPrefixTimeout.current);
      gPrefixTimeout.current = null;
    }
  }, []);

  // Handle navigation shortcuts
  const handleNavigation = useCallback(
    (key: string) => {
      const navKey = key.toLowerCase() as NavigationKey;
      const route = NAVIGATION_ROUTES[navKey];
      if (route) {
        router.push(route.path);
        return true;
      }
      return false;
    },
    [router]
  );

  // Focus search input
  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>(
      "[data-search-input]"
    );
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      return true;
    }
    return false;
  }, []);

  // Blur active element
  const blurActiveElement = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      activeElement.blur();
    }
  }, []);

  // Main keydown handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = event.key;

      // Escape always works - blur inputs or close dialogs
      if (key === "Escape") {
        blurActiveElement();
        clearGPrefix();
        return;
      }

      // Check if we should ignore this shortcut (typing in input, etc.)
      if (shouldIgnoreShortcut(event)) {
        clearGPrefix();
        return;
      }

      // Handle g-prefix sequences
      if (gPrefixActive.current) {
        clearGPrefix();
        if (handleNavigation(key)) {
          event.preventDefault();
          return;
        }
        // Invalid sequence, just fall through
      }

      // Start g-prefix sequence
      if (key === "g") {
        gPrefixActive.current = true;
        gPrefixTimeout.current = setTimeout(clearGPrefix, SEQUENCE_TIMEOUT);
        return;
      }

      // Help dialog
      if (key === "?") {
        event.preventDefault();
        onOpenHelp?.();
        return;
      }

      // Focus search with / or Ctrl+K
      if (key === "/" || (event.ctrlKey && key === "k")) {
        event.preventDefault();
        focusSearch();
        return;
      }

      // Check page-specific shortcuts
      for (const shortcut of shortcuts) {
        if (shortcut.key.toLowerCase() === key.toLowerCase()) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [
      enabled,
      shortcuts,
      onOpenHelp,
      handleNavigation,
      focusSearch,
      blurActiveElement,
      clearGPrefix,
    ]
  );

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    shortcutSubscribers.add(handleKeyDown);
    ensureGlobalKeyboardListener();

    return () => {
      shortcutSubscribers.delete(handleKeyDown);
      teardownGlobalKeyboardListenerIfIdle();
      clearGPrefix();
    };
  }, [enabled, handleKeyDown, clearGPrefix]);
}
