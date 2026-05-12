"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { disconnectGmail } from "@/lib/auth/gmail";

interface DisconnectGmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional id used to wire aria-describedby (callers may have multiple instances on a page). */
  describedById?: string;
}

/**
 * Single source of truth for the Gmail disconnect confirm flow.
 * Used from <ProfileMenu> (sidebar) and <AccountSection> (/preferences).
 * Locked microcopy + locked error voice.
 */
export function DisconnectGmailDialog({
  open,
  onOpenChange,
  describedById = "disconnect-gmail-desc",
}: DisconnectGmailDialogProps) {
  const { refresh } = useAuth();
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await disconnectGmail();
      await refresh();
      onOpenChange(false);
      toast("Gmail disconnected.");
    } catch {
      toast("We hit a snag. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={describedById}>
        <DialogHeader>
          <DialogTitle>Disconnect Gmail?</DialogTitle>
          <DialogDescription id={describedById}>
            Knock won&apos;t be able to send until you reconnect.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {busy ? "Disconnecting…" : "Disconnect Gmail"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
