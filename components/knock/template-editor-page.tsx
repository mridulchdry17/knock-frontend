"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscardConfirm } from "@/components/knock/template-editor-modal";
import { useTemplates } from "@/lib/templates/use-templates";
import { ApiError } from "@/lib/api/errors";
import type { TemplateEditorValue } from "@/components/knock/template-editor";

const TemplateEditor = dynamic(
  () =>
    import("@/components/knock/template-editor").then((m) => ({
      default: m.TemplateEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3 p-card" aria-label="Loading editor">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    ),
  },
);

interface TemplateEditorPageProps {
  /** Pass null when this is the /templates/new flow. */
  templateId: string | null;
}

/**
 * Mobile full-screen editor page for `/templates/[id]/edit` and
 * `/templates/new`. Uses the same Tiptap editor as the desktop modal but
 * stacks Edit / Preview into a tab toggle and gives Save / Cancel a sticky
 * top bar instead of a footer.
 *
 * Test-send hides into the spec'd "More" location to save space — for v0
 * we surface it as a footer button below the editor (still ghost, mobile
 * users tap once to test); a true overflow menu is a future polish.
 */
export function TemplateEditorPage({ templateId }: TemplateEditorPageProps) {
  const router = useRouter();
  const { items, status, mutations } = useTemplates();

  const [tab, setTab] = React.useState<"edit" | "preview">("edit");
  const [confirming, setConfirming] = React.useState(false);
  const dirtyRef = React.useRef(false);

  const isNew = templateId === null;
  const existing = templateId
    ? items.find((t) => t.id === templateId) ?? null
    : null;

  const initial: TemplateEditorValue = existing
    ? { name: existing.name, subject: existing.subject, body: existing.body }
    : { name: "", subject: "", body: "" };

  const goBack = () => router.push("/templates");

  const requestClose = () => {
    if (dirtyRef.current) {
      setConfirming(true);
      return;
    }
    goBack();
  };

  const handleSave = async (value: TemplateEditorValue) => {
    dirtyRef.current = true;
    if (isNew) {
      try {
        await mutations.create(value);
        toast.success("Template saved.");
        dirtyRef.current = false;
        goBack();
      } catch (err) {
        if (err instanceof ApiError && err.code === "template_limit_reached") {
          toast.error("You're at your 3-template limit.");
          dirtyRef.current = false;
          goBack();
          return;
        }
        throw err;
      }
    } else if (templateId) {
      await mutations.update(templateId, value);
      dirtyRef.current = false;
    }
  };

  const handleTestSend = async () => {
    if (!templateId) {
      toast.message("Save the template before sending a test.");
      return;
    }
    try {
      await mutations.testSend(templateId);
      toast.success("Test sent — check your inbox.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "gmail_disconnected") {
        toast.error("Connect Gmail before sending a test.");
        return;
      }
      toast.error("We hit a snag. Try again in a moment.");
    }
  };

  // While the list is still loading on a hard refresh, show a skeleton instead
  // of mounting the editor with empty initial values (would flash an empty
  // editor that then jumps to populated when the list resolves).
  if (!isNew && status === "loading") {
    return (
      <div className="flex flex-col gap-3 p-card">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[240px] w-full" />
      </div>
    );
  }

  if (!isNew && !existing && status !== "loading") {
    return (
      <div className="p-gutter">
        <p className="text-body text-ink-2">Template not found.</p>
        <Button variant="ghost" className="mt-4" onClick={goBack}>
          Back to templates
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-paper px-card py-3">
        <Button variant="ghost" size="sm" onClick={requestClose}>
          Cancel
        </Button>
        <span className="text-h3 text-ink">
          {isNew ? "New template" : "Edit template"}
        </span>
        <div aria-hidden className="w-[64px]" />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "edit" | "preview")}
        className="border-b border-line"
      >
        <TabsList className="px-card">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 px-card py-4">
        <TemplateEditor
          initial={initial}
          showNameInput={isNew}
          onSave={handleSave}
          onCancel={requestClose}
          onTestSend={existing ? handleTestSend : undefined}
          compact
          activeMobileTab={tab}
        />
      </div>

      <DiscardConfirm
        open={confirming}
        onOpenChange={setConfirming}
        onDiscard={() => {
          setConfirming(false);
          dirtyRef.current = false;
          goBack();
        }}
      />
    </div>
  );
}
