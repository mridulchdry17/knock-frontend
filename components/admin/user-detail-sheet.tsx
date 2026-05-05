"use client";

import * as React from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/knock/tier-badge";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/format/relative-time";
import type { AdminUserOut } from "@/lib/admin/types";

interface UserDetailSheetProps {
  user: AdminUserOut | null;
  onOpenChange: (open: boolean) => void;
  onApprove: (user: AdminUserOut) => void;
  onPromote: (user: AdminUserOut) => void;
  onSuspend: (user: AdminUserOut) => void;
  onUnsuspend: (user: AdminUserOut) => void;
  busy?: boolean;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <dt className="text-caption uppercase text-ink-3">{label}</dt>
      <dd className="col-span-2 text-small text-ink">{value}</dd>
    </div>
  );
}

export function UserDetailSheet({
  user,
  onOpenChange,
  onApprove,
  onPromote,
  onSuspend,
  onUnsuspend,
  busy = false,
}: UserDetailSheetProps) {
  return (
    <Sheet open={Boolean(user)} onOpenChange={onOpenChange}>
      <SheetContent>
        {user ? (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="truncate">{user.email}</SheetTitle>
                  {user.full_name ? (
                    <p className="mt-1 text-small text-ink-2 truncate">{user.full_name}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <TierBadge tier={user.tier} />
                  {user.is_suspended ? <Badge tone="bordeaux">Suspended</Badge> : null}
                </div>
              </div>
            </SheetHeader>

            <SheetBody>
              <dl className="divide-y divide-line">
                <Field label="ID" value={<span className="font-mono">{user.id}</span>} />
                <Field
                  label="Joined"
                  value={
                    <span title={user.created_at}>
                      {relativeTime(user.created_at)}
                    </span>
                  }
                />
                <Field
                  label="Tier set"
                  value={
                    user.tier_set_at ? (
                      <span title={user.tier_set_at}>{relativeTime(user.tier_set_at)}</span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )
                  }
                />
                <Field
                  label="Waitlist email"
                  value={
                    user.waitlist_email ? (
                      user.waitlist_email
                    ) : (
                      <span className="text-ink-3">—</span>
                    )
                  }
                />
                <Field
                  label="Gmail"
                  value={
                    user.has_gmail_connected ? (
                      <Badge tone="moss">Connected</Badge>
                    ) : (
                      <Badge tone="neutral">Not connected</Badge>
                    )
                  }
                />
              </dl>
            </SheetBody>

            <SheetFooter>
              {user.tier === "pending" && !user.is_suspended ? (
                <Button onClick={() => onApprove(user)} disabled={busy}>
                  Approve to free
                </Button>
              ) : null}
              {user.tier === "free" && !user.is_suspended ? (
                <Button onClick={() => onPromote(user)} disabled={busy}>
                  Promote to paid
                </Button>
              ) : null}
              {user.is_suspended ? (
                <Button variant="secondary" onClick={() => onUnsuspend(user)} disabled={busy}>
                  Unsuspend
                </Button>
              ) : (
                user.tier !== "super_admin" ? (
                  <Button variant="destructive" onClick={() => onSuspend(user)} disabled={busy}>
                    Suspend
                  </Button>
                ) : null
              )}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
