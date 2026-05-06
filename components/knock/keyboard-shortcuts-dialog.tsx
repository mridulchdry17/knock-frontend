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

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "J", description: "Next card" },
  { keys: "K", description: "Previous card" },
  { keys: "R", description: "Toggle ready on focused card" },
  { keys: "S", description: "Toggle skipped on focused card" },
  { keys: "E", description: "Open inline editor" },
  { keys: "⌘ Enter", description: "Send today's batch" },
  { keys: "?", description: "Show this cheat sheet" },
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
        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 text-small text-ink"
            >
              <span>{s.description}</span>
              <kbd className="rounded-sm border border-line-2 bg-paper-2 px-2 py-0.5 text-caption font-medium text-ink-2">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
