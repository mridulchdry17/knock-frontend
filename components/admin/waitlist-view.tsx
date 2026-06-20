"use client";

import * as React from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/knock/empty-state";
import { useDebounced } from "@/components/admin/use-debounced";
import {
  approveWaitlist,
  bulkApproveWaitlist,
  downloadWaitlistCsv,
  listWaitlist,
  revokeWaitlist,
  type WaitlistSort,
  type WaitlistStatus,
} from "@/lib/admin/waitlist";
import type { AdminWaitlistOut, Page } from "@/lib/admin/types";
import { ApiError } from "@/lib/api/errors";
import { relativeTime } from "@/lib/format/relative-time";

const PAGE_SIZE = 50;

const TABS: { value: WaitlistStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
];

function emptyMessage(tab: WaitlistStatus, hasSearch: boolean): string {
  if (hasSearch) return "No matches.";
  if (tab === "pending") return "No one waiting. New signups will land here.";
  if (tab === "approved") return "No one approved yet.";
  return "No one on the waitlist yet.";
}

export function WaitlistView() {
  const [tab, setTab] = React.useState<WaitlistStatus>("pending");
  const [searchInput, setSearchInput] = React.useState("");
  const search = useDebounced(searchInput, 300);
  const [sort, setSort] = React.useState<WaitlistSort>("newest");
  const [offset, setOffset] = React.useState(0);

  const [page, setPage] = React.useState<Page<AdminWaitlistOut> | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = React.useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [downloading, setDownloading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const reload = () => setReloadKey((k) => k + 1);

  // Filters changing → reset to first page + clear selections (the row ids
  // would no longer be visible anyway and bulk-approving off-screen rows is
  // confusing UX).
  React.useEffect(() => {
    setOffset(0);
    setSelectedIds(new Set());
  }, [tab, search, sort]);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    listWaitlist({
      limit: PAGE_SIZE,
      offset,
      search: search.trim() || undefined,
      status: tab,
      sort,
    })
      .then((p) => {
        if (cancelled) return;
        setPage(p);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err : new ApiError(0, "unknown", "We hit a snag."),
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [tab, search, sort, offset, reloadKey]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadWaitlistCsv();
    } catch {
      toast.error("We hit a snag downloading the CSV.");
    } finally {
      setDownloading(false);
    }
  };

  const applyApproval = (updated: AdminWaitlistOut) => {
    setPage((p) =>
      p
        ? { ...p, items: p.items.map((it) => (it.id === updated.id ? updated : it)) }
        : p,
    );
  };

  const allowAs = async (row: AdminWaitlistOut, tier: "free" | "paid") => {
    setBusyId(row.id);
    try {
      const updated = await approveWaitlist(row.id, tier);
      applyApproval(updated);
      toast.success(
        tier === "paid"
          ? `Allowed ${row.email} in as paid`
          : `Allowed ${row.email} in`,
      );
    } catch {
      toast.error("We hit a snag updating access. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (row: AdminWaitlistOut) => {
    setBusyId(row.id);
    try {
      const updated = await revokeWaitlist(row.id);
      applyApproval(updated);
      toast.success(`Revoked access for ${row.email}`);
    } catch {
      toast.error("We hit a snag updating access. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds).map((id) => Number(id));
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await bulkApproveWaitlist(ids, "free");
      // Locked microcopy — describe what changed.
      const parts: string[] = [];
      parts.push(
        `Approved ${result.newly_approved} ${result.newly_approved === 1 ? "person" : "people"}`,
      );
      if (result.already_approved > 0) {
        parts.push(`${result.already_approved} was already approved`);
      }
      if (result.not_found_ids.length > 0) {
        parts.push(`${result.not_found_ids.length} not found`);
      }
      toast.success(parts.join(" · "));
      setSelectedIds(new Set());
      reload();
    } catch {
      toast.error("We hit a snag approving. Try again.");
    } finally {
      setBulkBusy(false);
    }
  };

  const items = page?.items ?? [];
  const total = page?.total ?? 0;
  const showingFrom = items.length === 0 ? 0 : offset + 1;
  const showingTo = offset + items.length;

  // Bulk-select is only meaningful on the Pending tab (Approved rows can't
  // be bulk-approved a second time; All is mixed). Keep the UX tight.
  const allowBulkSelect = tab === "pending";
  const selectableIds = items.filter((r) => !r.approved_at).map((r) => r.id);
  const allOnPageSelected =
    allowBulkSelect &&
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of selectableIds) next.delete(id);
      } else {
        for (const id of selectableIds) next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="px-gutter py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-ink">Waitlist</h1>
          {status === "ready" ? (
            <p className="mt-1 text-small text-ink-2">Showing {total}</p>
          ) : null}
        </div>
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? "Preparing…" : "Download CSV"}
        </Button>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as WaitlistStatus)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          type="search"
          placeholder="Search by email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search waitlist"
          className="sm:max-w-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as WaitlistSort)}
          aria-label="Sort"
          className="h-10 rounded-md border border-line-2 bg-paper px-3 text-small text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:w-auto"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {status === "error" ? (
        <Alert tone="danger" className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>We hit a snag loading the waitlist. {error?.message ?? ""}</span>
            <Button size="sm" variant="secondary" onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {status === "loading" || status === "idle" ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading waitlist">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : status === "ready" && items.length === 0 ? (
        <EmptyState title={emptyMessage(tab, Boolean(search.trim()))} />
      ) : status === "ready" ? (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-md border border-line">
            <table className="w-full text-small">
              <thead className="bg-paper-2 text-ink-2">
                <tr>
                  {allowBulkSelect ? (
                    <th className="w-10 px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        aria-label="Select all on page"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        disabled={selectableIds.length === 0}
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Joined</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Access</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-line hover:bg-paper-2">
                    {allowBulkSelect ? (
                      <td className="w-10 px-3 py-3">
                        {row.approved_at ? null : (
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.email}`}
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                          />
                        )}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-ink">{row.email}</td>
                    <td className="px-4 py-3 text-ink-2" title={row.created_at}>
                      {relativeTime(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ApprovalBadge
                        approvedAt={row.approved_at}
                        tier={row.intended_tier}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        row={row}
                        busy={busyId === row.id}
                        onAllow={(tier) => allowAs(row, tier)}
                        onRevoke={() => revoke(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 lg:hidden">
            {items.map((row) => (
              <li key={row.id} className="rounded-md border border-line bg-paper p-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {allowBulkSelect && !row.approved_at ? (
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.email}`}
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="mt-1"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="truncate text-body text-ink">{row.email}</div>
                      <div className="mt-1 text-caption text-ink-3" title={row.created_at}>
                        Joined {relativeTime(row.created_at)}
                      </div>
                      <div className="mt-2">
                        <ApprovalBadge
                          approvedAt={row.approved_at}
                          tier={row.intended_tier}
                        />
                      </div>
                    </div>
                  </div>
                  <RowActions
                    row={row}
                    busy={busyId === row.id}
                    onAllow={(tier) => allowAs(row, tier)}
                    onRevoke={() => revoke(row)}
                  />
                </div>
              </li>
            ))}
          </ul>

          {total > 0 ? (
            <div className="mt-4 flex items-center justify-between text-small text-ink-2">
              <div>
                Showing {showingFrom}–{showingTo} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Sticky bulk-approve bar */}
      {selectedIds.size > 0 ? (
        <div
          role="region"
          aria-label="Bulk approve"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper-2 px-gutter py-3 shadow-md"
        >
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
            <div className="text-small text-ink">
              {selectedIds.size} selected
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkBusy}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={bulkBusy}
              >
                {bulkBusy
                  ? "Approving…"
                  : `Approve ${selectedIds.size} as free`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApprovalBadge({
  approvedAt,
  tier,
}: {
  approvedAt?: string | null;
  tier?: "free" | "paid";
}) {
  if (approvedAt) {
    return (
      <span className="inline-flex items-center rounded-pill bg-moss-tint px-2 py-0.5 text-caption font-medium text-moss">
        Allowed{tier === "paid" ? " · Paid" : " · Free"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-pill border border-line-2 px-2 py-0.5 text-caption text-ink-3">
      Waiting
    </span>
  );
}

/** Per-row action cluster: two Allow buttons when waiting, Revoke when allowed. */
function RowActions({
  row,
  busy,
  onAllow,
  onRevoke,
}: {
  row: AdminWaitlistOut;
  busy: boolean;
  onAllow: (tier: "free" | "paid") => void;
  onRevoke: () => void;
}) {
  if (busy) {
    return (
      <Button size="sm" variant="ghost" disabled>
        Saving…
      </Button>
    );
  }
  if (row.approved_at) {
    return (
      <Button size="sm" variant="ghost" onClick={onRevoke}>
        Revoke
      </Button>
    );
  }
  return (
    <div className="inline-flex items-center gap-2">
      <Button size="sm" variant="primary" onClick={() => onAllow("free")}>
        Allow as free
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onAllow("paid")}>
        as paid
      </Button>
    </div>
  );
}
