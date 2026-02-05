"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  GLOBAL_SHORTCUTS,
  PAGE_SHORTCUTS,
  parseShortcut,
  formatKeyForDisplay,
} from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-mono font-medium bg-muted border border-border rounded shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutRow({
  shortcut,
  description,
}: {
  shortcut: string;
  description: string;
}) {
  const keys = parseShortcut(shortcut);

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center gap-1">
            <Kbd>{formatKeyForDisplay(key)}</Kbd>
            {index < keys.length - 1 && (
              <span className="text-xs text-muted-foreground mx-0.5">then</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function ShortcutSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-display uppercase tracking-wider text-primary mb-2">
        {title}
      </h3>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  );
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  // Filter navigation shortcuts (g-prefix)
  const navigationShortcuts = GLOBAL_SHORTCUTS.filter((s) => s.sequence);
  const generalShortcuts = GLOBAL_SHORTCUTS.filter((s) => !s.sequence);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate and control Cosmic Index with your keyboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Navigation */}
          <ShortcutSection title="Navigation">
            {navigationShortcuts.map((shortcut) => (
              <ShortcutRow
                key={shortcut.key}
                shortcut={shortcut.key}
                description={shortcut.description}
              />
            ))}
          </ShortcutSection>

          {/* Page Actions */}
          <ShortcutSection title="Page Actions">
            {PAGE_SHORTCUTS.map((shortcut) => (
              <ShortcutRow
                key={shortcut.key}
                shortcut={shortcut.key}
                description={
                  shortcut.description +
                  (shortcut.pages
                    ? ` (${shortcut.pages.join(", ")})`
                    : "")
                }
              />
            ))}
          </ShortcutSection>

          {/* General */}
          <ShortcutSection title="General">
            {generalShortcuts.map((shortcut) => (
              <ShortcutRow
                key={shortcut.key}
                shortcut={shortcut.key}
                description={shortcut.description}
              />
            ))}
          </ShortcutSection>

          {/* Note about input focus */}
          <p className="text-xs text-muted-foreground/70 italic pt-2 border-t border-border/50">
            Shortcuts are disabled while typing in search or input fields.
            Press <Kbd>Esc</Kbd> to exit input focus.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
