"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/knock/empty-state";
import { downloadWaitlistCsv, listWaitlist } from "@/lib/admin/waitlist";
import type { AdminWaitlistOut, Page } from "@/lib/admin/types";
import { ApiError } from "@/lib/api/errors";
import { relativeTime } from "@/lib/format/relative-time";

const PAGE_SIZE = 50;
const EMPTY = "No one on the waitlist yet.";

export function WaitlistView() {
  const [page, setPage] = React.useState<Page<AdminWaitlistOut> | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = React.useState<ApiError | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [downloading, setDownloading] = React.useState(false);

  const reload = () => setReloadKey((k) => k + 1);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    listWaitlist({ limit: PAGE_SIZE, offset })
      .then((p) => {
        if (cancelled) return;
        setPage(p);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err : new ApiError(0, "unknown", "We hit a snag."));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [offset, reloadKey]);

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

  const items = page?.items ?? [];
  const total = page?.total ?? 0;
  const showingFrom = items.length === 0 ? 0 : offset + 1;
  const showingTo = offset + items.length;

  return (
    <div className="px-gutter py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-ink">Waitlist</h1>
          {status === "ready" ? (
            <p className="mt-1 text-small text-ink-2">Total: {total}</p>
          ) : null}
        </div>
        <Button onClick={handleDownload} disabled={downloading || total === 0}>
          {downloading ? "Preparing…" : "Download CSV"}
        </Button>
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
        <EmptyState title={EMPTY} />
      ) : status === "ready" ? (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-md border border-line">
            <table className="w-full text-small">
              <thead className="bg-paper-2 text-ink-2">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-line hover:bg-paper-2">
                    <td className="px-4 py-3 text-ink">{row.email}</td>
                    <td className="px-4 py-3 text-ink-2" title={row.created_at}>
                      {relativeTime(row.created_at)}
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
                <div className="text-body text-ink">{row.email}</div>
                <div className="mt-1 text-caption text-ink-3" title={row.created_at}>
                  Joined {relativeTime(row.created_at)}
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
    </div>
  );
}
