"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TemplateEditorValue } from "@/components/knock/template-editor";

/**
 * Lazy-load Tiptap-bearing editor only when the modal opens. Without dynamic
 * import the entire Tiptap bundle (~80KB gz + Prosemirror) lands on /templates
 * list paint. ssr:false skips SSR for the editor (it relies on contentEditable).
 */
const TemplateEditor = dynamic(
  () =>
    import("@/components/knock/template-editor").then((m) => ({
      default: m.TemplateEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3" aria-label="Loading editor">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    ),
  },
);

interface TemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TemplateEditorValue;
  isNew: boolean;
  onSave: (value: TemplateEditorValue) => Promise<void>;
  onTestSend?: () => Promise<void>;
}

/**
 * Desktop full-screen modal wrapper around <TemplateEditor>.
 *
 * Owns the discard-confirm flow when closing while dirty — mobile route uses
 * the same confirm via DiscardConfirm helper below.
 */
export function TemplateEditorModal({
  open,
  onOpenChange,
  initial,
  isNew,
  onSave,
  onTestSend,
}: TemplateEditorModalProps) {
  const [confirming, setConfirming] = React.useState(false);
  const dirtyRef = React.useRef(false);

  const handleSave = async (value: TemplateEditorValue) => {
    await onSave(value);
    dirtyRef.current = false;
  };

  const handleSaveTracked = async (value: TemplateEditorValue) => {
    dirtyRef.current = true;
    await handleSave(value);
  };

  const requestClose = () => {
    if (dirtyRef.current) {
      setConfirming(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
          else onOpenChange(true);
        }}
      >
        <DialogContent
          className="flex h-[90vh] w-[calc(100vw-32px)] max-w-[1100px] flex-col gap-4 p-6"
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click when dirty without confirm.
            if (dirtyRef.current) {
              e.preventDefault();
              setConfirming(true);
            }
          }}
        >
          <DialogTitle className="text-h2">
            {isNew ? "New template" : "Edit template"}
          </DialogTitle>
          <div className="min-h-0 flex-1">
            <TemplateEditor
              initial={initial}
              showNameInput={isNew}
              onSave={handleSaveTracked}
              onCancel={requestClose}
              onTestSend={onTestSend}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DiscardConfirm
        open={confirming}
        onOpenChange={setConfirming}
        onDiscard={() => {
          setConfirming(false);
          dirtyRef.current = false;
          onOpenChange(false);
        }}
      />
    </>
  );
}

interface DiscardConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}

/**
 * Reused by both the desktop modal and the mobile editor route. Locked
 * microcopy: "Discard changes?" / "Your edits will be lost."
 */
export function DiscardConfirm({
  open,
  onOpenChange,
  onDiscard,
}: DiscardConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogTitle>Discard changes?</DialogTitle>
        <p className="mt-2 text-body text-ink-2">Your edits will be lost.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
