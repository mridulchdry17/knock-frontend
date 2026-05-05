"use client";

import * as React from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/knock/tier-badge";
import { EmptyState } from "@/components/knock/empty-state";
import { InlineConfirm } from "@/components/admin/inline-confirm";
import { SuspendModal } from "@/components/admin/suspend-modal";
import { UserDetailSheet } from "@/components/admin/user-detail-sheet";
import { useDebounced } from "@/components/admin/use-debounced";
import { USERS_PAGE_SIZE, useUsers } from "@/components/admin/use-users";
import { suspendUser, unsuspendUser, updateTier, type UsersTab } from "@/lib/admin/users";
import type { AdminUserOut } from "@/lib/admin/types";
import { relativeTime } from "@/lib/format/relative-time";

const TABS: { value: UsersTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "suspended", label: "Suspended" },
  { value: "all", label: "All" },
];

const PENDING_EMPTY = "No one waiting. New signups will land here.";
const GENERIC_EMPTY = "Nothing here yet.";

export function UsersView() {
  const [tab, setTab] = React.useState<UsersTab>("pending");
  const [searchInput, setSearchInput] = React.useState("");
  const search = useDebounced(searchInput, 300);
  const [offset, setOffset] = React.useState(0);

  // Reset offset when filters change.
  React.useEffect(() => {
    setOffset(0);
  }, [tab, search]);

  const { status, page, items, error, reload } = useUsers({ tab, search, offset });

  // Local optimistic-removal: rows we just acted on collapse before refetch lands.
  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());

  const handleRemovedFromList = React.useCallback(
    (id: string) => {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      // After the collapse animation, drop the marker and refetch.
      window.setTimeout(() => {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        reload();
      }, 320);
    },
    [reload],
  );

  // Detail sheet + suspend modal state.
  const [selected, setSelected] = React.useState<AdminUserOut | null>(null);
  const [suspendTarget, setSuspendTarget] = React.useState<AdminUserOut | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleApprove = async (user: AdminUserOut) => {
    try {
      setBusy(true);
      await updateTier(user.id, "free");
      toast.success("Approved. They're in.");
      handleRemovedFromList(user.id);
      setSelected(null);
    } catch {
      toast.error("We hit a snag. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (user: AdminUserOut, reason?: string) => {
    try {
      setBusy(true);
      await suspendUser(user.id, reason);
      toast.success("Rejected. They've been removed from the queue.");
      handleRemovedFromList(user.id);
      setSelected(null);
    } catch {
      toast.error("We hit a snag. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const handlePromote = async (user: AdminUserOut) => {
    try {
      setBusy(true);
      await updateTier(user.id, "paid");
      toast.success("Promoted to paid.");
      handleRemovedFromList(user.id);
      setSelected(null);
    } catch {
      toast.error("We hit a snag. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const handleSuspendConfirm = async (reason: string) => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await suspendUser(suspendTarget.id, reason);
      toast.success("User suspended.");
      handleRemovedFromList(suspendTarget.id);
      setSelected(null);
      setSuspendTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const handleUnsuspend = async (user: AdminUserOut) => {
    try {
      setBusy(true);
      await unsuspendUser(user.id);
      toast.success("Unsuspended.");
      handleRemovedFromList(user.id);
      setSelected(null);
    } catch {
      toast.error("We hit a snag. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const total = page?.total ?? 0;
  const showingFrom = items.length === 0 ? 0 : offset + 1;
  const showingTo = offset + items.length;

  const visibleItems = items.filter((u) => !removingIds.has(u.id));

  return (
    <div className="px-gutter py-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-h1 text-ink">Users</h1>
          {status === "ready" ? (
            <Badge tone="neutral" aria-label={`${total} users in this tab`}>
              {total}
            </Badge>
          ) : null}
        </div>
        <div className="w-full sm:w-72">
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email"
            aria-label="Search users by email"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as UsersTab)}>
        <TabsList aria-label="User tier tabs">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Error banner */}
      {status === "error" ? (
        <Alert tone="danger" className="mt-4">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>We hit a snag loading users. {error?.message ?? ""}</span>
            <Button size="sm" variant="secondary" onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Body */}
      <div className="mt-4">
        {status === "loading" || status === "idle" ? (
          <SkeletonRows />
        ) : status === "ready" && visibleItems.length === 0 ? (
          <EmptyState
            title={tab === "pending" ? PENDING_EMPTY : GENERIC_EMPTY}
            body={
              tab === "pending"
                ? undefined
                : search
                  ? "Try a different email or clear the search."
                  : undefined
            }
          />
        ) : status === "ready" ? (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <UsersTable
                tab={tab}
                items={visibleItems}
                removingIds={removingIds}
                busy={busy}
                onSelect={setSelected}
                onApprove={handleApprove}
                onReject={handleReject}
                onSuspendOpen={(u) => setSuspendTarget(u)}
                onUnsuspend={handleUnsuspend}
              />
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden">
              <UsersCardList
                tab={tab}
                items={visibleItems}
                removingIds={removingIds}
                busy={busy}
                onSelect={setSelected}
                onApprove={handleApprove}
                onReject={handleReject}
                onSuspendOpen={(u) => setSuspendTarget(u)}
                onUnsuspend={handleUnsuspend}
              />
            </div>

            {/* Pagination */}
            <Pagination
              from={showingFrom}
              to={showingTo}
              total={total}
              hasPrev={offset > 0}
              hasNext={offset + USERS_PAGE_SIZE < total}
              onPrev={() => setOffset(Math.max(0, offset - USERS_PAGE_SIZE))}
              onNext={() => setOffset(offset + USERS_PAGE_SIZE)}
            />
          </>
        ) : null}
      </div>

      <UserDetailSheet
        user={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onApprove={(u) => void handleApprove(u)}
        onPromote={(u) => void handlePromote(u)}
        onSuspend={(u) => setSuspendTarget(u)}
        onUnsuspend={(u) => void handleUnsuspend(u)}
        busy={busy}
      />

      <SuspendModal
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
        email={suspendTarget?.email ?? ""}
        onConfirm={handleSuspendConfirm}
      />
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading users">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

interface RowActionsProps {
  tab: UsersTab;
  user: AdminUserOut;
  busy: boolean;
  onApprove: (user: AdminUserOut) => Promise<void> | void;
  onReject: (user: AdminUserOut, reason?: string) => Promise<void> | void;
  onSuspendOpen: (user: AdminUserOut) => void;
  onUnsuspend: (user: AdminUserOut) => Promise<void> | void;
}

function RowActions({ tab, user, busy, onApprove, onReject, onSuspendOpen, onUnsuspend }: RowActionsProps) {
  // Pending: Approve + Reject (inline morph for both).
  if (tab === "pending" || (tab === "all" && user.tier === "pending" && !user.is_suspended)) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <InlineConfirm
          label="Approve"
          variant="primary"
          question={`Approve ${user.email}?`}
          confirmLabel="Yes"
          onConfirm={async () => {
            await onApprove(user);
          }}
          disabled={busy}
        />
        <InlineConfirm
          label="Reject"
          variant="secondary"
          question={`Reject ${user.email}?`}
          confirmLabel="Reject"
          withReason
          reasonPlaceholder="Reason (optional)"
          onConfirm={async (reason) => {
            await onReject(user, reason);
          }}
          disabled={busy}
        />
      </div>
    );
  }

  if (user.is_suspended) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          void onUnsuspend(user);
        }}
        disabled={busy}
      >
        Unsuspend
      </Button>
    );
  }

  if (user.tier === "super_admin") {
    return <span className="text-caption text-ink-3">—</span>;
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        onSuspendOpen(user);
      }}
      disabled={busy}
    >
      Suspend
    </Button>
  );
}

interface ListProps {
  tab: UsersTab;
  items: AdminUserOut[];
  removingIds: Set<string>;
  busy: boolean;
  onSelect: (user: AdminUserOut) => void;
  onApprove: (user: AdminUserOut) => Promise<void> | void;
  onReject: (user: AdminUserOut, reason?: string) => Promise<void> | void;
  onSuspendOpen: (user: AdminUserOut) => void;
  onUnsuspend: (user: AdminUserOut) => Promise<void> | void;
}

function UsersTable({ tab, items, removingIds, busy, onSelect, onApprove, onReject, onSuspendOpen, onUnsuspend }: ListProps) {
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <table className="w-full text-small">
        <thead className="bg-paper-2 text-ink-2">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Joined</th>
            <th className="px-4 py-2 text-left font-medium">Tier</th>
            <th className="px-4 py-2 text-left font-medium">Daily limit</th>
            <th className="px-4 py-2 text-left font-medium">Last active</th>
            <th className="px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => {
            const removing = removingIds.has(u.id);
            return (
              <tr
                key={u.id}
                className={
                  "cursor-pointer border-t border-line transition-all hover:bg-paper-2 " +
                  (removing
                    ? "pointer-events-none opacity-0 [transform:scaleY(0.6)] [transition:all_320ms_ease-out]"
                    : "")
                }
                onClick={() => onSelect(u)}
              >
                <td className="px-4 py-3 text-ink">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{u.email}</span>
                    {u.is_suspended ? <Badge tone="bordeaux">Suspended</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-2" title={u.created_at}>
                  {relativeTime(u.created_at)}
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier={u.tier} />
                </td>
                <td className="px-4 py-3 text-ink-2">—</td>
                <td className="px-4 py-3 text-ink-3">—</td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    tab={tab}
                    user={u}
                    busy={busy}
                    onApprove={onApprove}
                    onReject={onReject}
                    onSuspendOpen={onSuspendOpen}
                    onUnsuspend={onUnsuspend}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UsersCardList({ tab, items, removingIds, busy, onSelect, onApprove, onReject, onSuspendOpen, onUnsuspend }: ListProps) {
  return (
    <ul className="space-y-2">
      {items.map((u) => {
        const removing = removingIds.has(u.id);
        return (
          <li
            key={u.id}
            className={
              "rounded-md border border-line bg-paper p-card transition-all " +
              (removing
                ? "pointer-events-none opacity-0 [transform:scaleY(0.6)] [transition:all_320ms_ease-out]"
                : "")
            }
          >
            <button
              type="button"
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
              onClick={() => onSelect(u)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body text-ink">{u.email}</div>
                  {u.full_name ? (
                    <div className="truncate text-small text-ink-2">{u.full_name}</div>
                  ) : null}
                  <div className="mt-1 text-caption text-ink-3" title={u.created_at}>
                    Joined {relativeTime(u.created_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <TierBadge tier={u.tier} />
                  {u.is_suspended ? <Badge tone="bordeaux">Suspended</Badge> : null}
                </div>
              </div>
            </button>
            <div className="mt-3 flex flex-col gap-2">
              <RowActions
                tab={tab}
                user={u}
                busy={busy}
                onApprove={onApprove}
                onReject={onReject}
                onSuspendOpen={onSuspendOpen}
                onUnsuspend={onUnsuspend}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Pagination({
  from,
  to,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  from: number;
  to: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-small text-ink-2">
      <div>
        Showing {from}–{to} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onPrev} disabled={!hasPrev}>
          Prev
        </Button>
        <Button size="sm" variant="secondary" onClick={onNext} disabled={!hasNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
