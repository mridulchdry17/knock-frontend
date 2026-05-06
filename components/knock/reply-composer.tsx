"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MinimalToolbar,
  minimalReplyExtensions,
  type RichTextEditorHandle,
} from "@/components/knock/rich-text-editor";
import { cn } from "@/lib/utils";

/**
 * Lazy-load the Tiptap editor — only mount when the composer is first
 * opened. Reply screens are visited often but the editor is expensive to
 * boot, so we skim ~80KB off the inbox cold paint by deferring.
 */
const RichTextEditor = dynamic(
  () =>
    import("@/components/knock/rich-text-editor").then((m) => ({
      default: m.RichTextEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-2" aria-label="Loading composer">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-[120px] w-full" />
      </div>
    ),
  },
);

export interface ReplyComposerProps {
  /** Called with the current HTML body when "Send reply" is clicked. */
  onSend: (bodyHtml: string) => Promise<void>;
  /** Disabled state (e.g. while a send is in flight). */
  disabled?: boolean;
  /** Optional initial draft to pre-fill (used by Knock-suggested follow-ups). */
  initialBody?: string;
  className?: string;
}

/**
 * Minimal Tiptap composer used at the bottom of /inbox thread detail.
 * StarterKit + Link only — replies aren't templated, no variables.
 *
 * UX:
 *  - "Send reply" disabled while editor is empty.
 *  - Failure path is owned by the caller via `onSend` rejection — composer
 *    keeps the draft intact and surfaces the locked snag voice.
 *  - On success the caller resets the composer via `key` prop bump.
 */
export function ReplyComposer({
  onSend,
  disabled,
  initialBody = "",
  className,
}: ReplyComposerProps) {
  const editorRef = React.useRef<RichTextEditorHandle | null>(null);
  const [body, setBody] = React.useState(initialBody);
  const [snag, setSnag] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  // Sync external initial change (e.g. user clicked "Edit & send" on a suggested followup).
  React.useEffect(() => {
    setBody(initialBody);
    editorRef.current?.setContent(initialBody);
  }, [initialBody]);

  const extensions = React.useMemo(() => minimalReplyExtensions(), []);

  const isEmpty = !body || body === "<p></p>" || stripHtml(body).trim().length === 0;

  const handleSend = async () => {
    if (isEmpty || sending || disabled) return;
    setSending(true);
    setSnag(null);
    try {
      await onSend(body);
      // Reset composer on success.
      setBody("");
      editorRef.current?.setContent("");
    } catch {
      // Caller throws to surface failure — keep draft + show locked snag voice.
      setSnag(
        "We hit a snag sending. Your draft is saved — try again or skip for today.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-line bg-paper p-4",
        className,
      )}
      data-testid="reply-composer"
    >
      <RichTextEditor
        ref={editorRef}
        value={initialBody}
        onChange={setBody}
        extensions={extensions}
        placeholder="Write a reply…"
        ariaLabel="Reply body"
        minHeight="min-h-[120px]"
        maxHeight="max-h-[40vh]"
        toolbar={(ed) => <MinimalToolbar editor={ed} showBullet />}
      />
      {snag ? (
        <p role="alert" className="text-small text-bordeaux">
          {snag}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={isEmpty || sending || disabled}
          data-testid="send-reply-btn"
        >
          {sending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}
