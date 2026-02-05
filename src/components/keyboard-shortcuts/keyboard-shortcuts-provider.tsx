"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";

interface KeyboardShortcutsContextValue {
  openHelp: () => void;
  closeHelp: () => void;
  isHelpOpen: boolean;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(
  null
);

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcutsContext must be used within KeyboardShortcutsProvider"
    );
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);

  // Register global shortcuts (navigation, help dialog)
  useKeyboardShortcuts({
    onOpenHelp: openHelp,
  });

  return (
    <KeyboardShortcutsContext.Provider
      value={{ openHelp, closeHelp, isHelpOpen }}
    >
      {children}
      <KeyboardShortcutsDialog
        open={isHelpOpen}
        onOpenChange={setIsHelpOpen}
      />
    </KeyboardShortcutsContext.Provider>
  );
}
