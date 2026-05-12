"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  label: string;
  items: { keys: string; description: string }[];
}

/**
 * Global keyboard cheat sheet, surfaced from anywhere via `?` (F.9 hoist).
 * Categorized by surface so users can scan to the section they care about.
 */
const GROUPS: ShortcutGroup[] = [
  {
    label: "Today",
    items: [
      { keys: "J", description: "Next card" },
      { keys: "K", description: "Previous card" },
      { keys: "R", description: "Toggle ready on focused card" },
      { keys: "S", description: "Toggle skipped on focused card" },
      { keys: "E", description: "Open inline editor" },
      { keys: "⌘ Enter", description: "Send today's batch" },
    ],
  },
  {
    label: "Inbox",
    items: [
      { keys: "J", description: "Next thread" },
      { keys: "K", description: "Previous thread" },
      { keys: "Enter", description: "Open selected thread" },
      { keys: "Esc", description: "Close thread" },
    ],
  },
  {
    label: "Global",
    items: [{ keys: "?", description: "Show this cheat sheet" }],
  },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move through your batch without the mouse.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => (
            <section key={group.label} className="flex flex-col gap-2">
              <h3 className="text-caption uppercase tracking-wide text-ink-3">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.items.map((s) => (
                  <li
                    key={`${group.label}-${s.keys}`}
                    className="flex items-center justify-between gap-3 text-small text-ink"
                  >
                    <span>{s.description}</span>
                    <kbd className="rounded-sm border border-line-2 bg-paper-2 px-2 py-0.5 text-caption font-medium text-ink-2">
                      {s.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-2 text-caption text-ink-3">
          Tap anywhere outside or press Esc to close.
        </p>
      </DialogContent>
    </Dialog>
  );
}
