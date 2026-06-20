"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateCard } from "@/components/knock/template-card";
import { TemplateEditorModal } from "@/components/knock/template-editor-modal";
import type { TemplateEditorValue } from "@/components/knock/template-editor";
import { useTemplates } from "@/lib/templates/use-templates";
import { ApiError } from "@/lib/api/errors";

const SETUP_COPY = "Setting up your starter templates…";
const SNAG_LOAD = "We hit a snag loading templates.";
const SNAG_DELETE = "We hit a snag. Try again in a moment.";

/**
 * Top-level /templates view. Renders header (counter pill + New button),
 * card grid, all states (loading / empty / populated / error), and the
 * editor modal + delete confirm.
 *
 * 3-template ceiling enforcement is UI-level only — the backend also returns
 * 422 template_limit_reached as a defensive guard, surfaced as a toast.
 */
export function TemplatesView() {
  const { status, items, count, cap, atCap, error, refresh, mutations } =
    useTemplates();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const editingTemplate = editingId
    ? items.find((t) => t.id === editingId) ?? null
    : null;
  const isNew = editorOpen && editingId === null;

  const initial: TemplateEditorValue = editingTemplate
    ? {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
      }
    : { name: "", subject: "", body: "" };

  const openNew = () => {
    if (atCap) return;
    setEditingId(null);
    setEditorOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const handleSave = async (value: TemplateEditorValue) => {
    if (isNew) {
      try {
        await mutations.create(value);
        toast.success("Template saved.");
        closeEditor();
      } catch (err) {
        if (err instanceof ApiError && err.code === "template_limit_reached") {
          toast.error("You're at your 3-template limit.");
          closeEditor();
          return;
        }
        // Re-throw so the editor's in-modal banner shows.
        throw err;
      }
    } else if (editingId) {
      await mutations.update(editingId, {
        name: value.name || initial.name,
        subject: value.subject,
        body: value.body,
      });
    }
  };

  const handleTestSend = async () => {
    if (!editingId) {
      toast.message("Save the template before sending a test.");
      return;
    }
    try {
      await mutations.testSend(editingId);
      toast.success("Test sent — check your inbox.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "gmail_disconnected") {
        toast.error("Connect Gmail before sending a test.", {
          action: {
            label: "Connect",
            onClick: () => {
              if (typeof window !== "undefined") {
                window.location.href = "/connect-gmail";
              }
            },
          },
        });
        return;
      }
      toast.error("We hit a snag. Try again in a moment.");
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await mutations.remove(id);
      toast.success("Template deleted.");
    } catch {
      toast.error(SNAG_DELETE);
    }
  };

  return (
    <TooltipProvider>
      <div className="mx-auto w-full max-w-[1080px] p-gutter">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-h1 text-ink">Templates</h1>
            <span
              data-testid="template-counter"
              className="inline-flex items-center rounded-pill bg-ember-tint px-3 py-1 text-small font-medium text-flint"
            >
              {count} of {cap}
            </span>
          </div>
          <NewTemplateButton atCap={atCap} onClick={openNew} />
        </header>

        {status === "error" ? (
          <div
            role="alert"
            className="mb-6 flex items-center justify-between gap-3 rounded-md border border-bordeaux-tint bg-bordeaux-tint/30 px-4 py-3 text-small text-ink"
          >
            <span>{error?.message ?? SNAG_LOAD}</span>
            <Button variant="ghost" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : null}

        {status === "loading" ? <CardGridSkeleton /> : null}

        {status === "empty" ? (
          <div className="flex flex-col items-center gap-6 py-12">
            <p className="text-body text-ink-2">{SETUP_COPY}</p>
            <CardGridSkeleton />
          </div>
        ) : null}

        {status === "populated" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {items.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onEdit={openEdit}
                onDelete={(id) => setDeletingId(id)}
                onSetDefault={async (id) => {
                  try {
                    const updated = await mutations.setDefault(id);
                    toast(`Autopilot will use "${updated.name}".`);
                  } catch {
                    toast.error("We hit a snag updating the default.");
                  }
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {editorOpen ? (
        <TemplateEditorModal
          open={editorOpen}
          onOpenChange={(o) => {
            if (!o) closeEditor();
            else setEditorOpen(true);
          }}
          initial={initial}
          isNew={isNew}
          onSave={handleSave}
          onTestSend={editingId ? handleTestSend : undefined}
        />
      ) : null}

      <DeleteConfirmDialog
        open={deletingId !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        count={count}
        cap={cap}
      />
    </TooltipProvider>
  );
}

interface NewTemplateButtonProps {
  atCap: boolean;
  onClick: () => void;
}

/**
 * Locked microcopy at cap: "You're at your 3-template limit. Edit or delete
 * one to add another." Tooltip wraps the disabled button so hover/focus on
 * the disabled state still surfaces the message.
 */
function NewTemplateButton({ atCap, onClick }: NewTemplateButtonProps) {
  if (!atCap) {
    return (
      <Button onClick={onClick} data-testid="new-template-btn">
        + New template
      </Button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label="New template (at limit)">
          <Button disabled data-testid="new-template-btn">
            + New template
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        You&rsquo;re at your 3-template limit. Edit or delete one to add another.
      </TooltipContent>
    </Tooltip>
  );
}

function CardGridSkeleton() {
  return (
    <div
      className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2"
      aria-label="Loading templates"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-[14px] border border-line bg-paper p-card"
        >
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="mt-2 flex justify-between">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
  cap: number;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
  cap,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogTitle>Delete this template?</DialogTitle>
        <p className="mt-2 text-body text-ink-2">
          You can always make a new one — you have {count} of {cap} used.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
