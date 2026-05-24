"use client";

import * as React from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/knock/empty-state";
import { InlineConfirm } from "@/components/admin/inline-confirm";
import { useDebounced } from "@/components/admin/use-debounced";
import {
  type AdminContactOut,
  deleteContact,
  listContacts,
  uploadContactsCsv,
} from "@/lib/admin/contacts";
import type { Page } from "@/lib/admin/types";
import { ApiError } from "@/lib/api/errors";

const PAGE_SIZE = 50;

function bounceLabel(reason: string | null): string {
  if (reason === "bounce") return "Bounced";
  if (reason === "bounce_patterns_exhausted") return "Bounced (no valid address)";
  return "Invalid";
}

export function ContactPoolView() {
  const [page, setPage] = React.useState<Page<AdminContactOut> | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = React.useState<ApiError | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [reloadKey, setReloadKey] = React.useState(0);

  const [searchInput, setSearchInput] = React.useState("");
  const search = useDebounced(searchInput, 300);
  const [bouncedOnly, setBouncedOnly] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = () => setReloadKey((k) => k + 1);

  // Reset to page 1 when the filters change.
  React.useEffect(() => {
    setOffset(0);
  }, [search, bouncedOnly]);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    listContacts({
      search: search || undefined,
      invalid_only: bouncedOnly,
      limit: PAGE_SIZE,
      offset,
    })
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
  }, [search, bouncedOnly, offset, reloadKey]);

  const handleDelete = async (row: AdminContactOut) => {
    try {
      await deleteContact(row.id);
      toast.success(`Removed ${row.email}`);
      reload();
    } catch {
      toast.error("We hit a snag deleting that contact.");
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const r = await uploadContactsCsv(file);
      toast.success(
        `Imported: ${r.inserted} added, ${r.updated} updated, ${r.skipped} skipped, ${r.failed} failed.`,
      );
      reload();
    } catch {
      toast.error("We hit a snag uploading the CSV.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
          <h1 className="text-h1 text-ink">Contact pool</h1>
          {status === "ready" ? (
            <p className="mt-1 text-small text-ink-2">
              {bouncedOnly ? "Bounced / invalid" : "Total"}: {total}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload CSV"}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, email, or company"
          className="sm:max-w-sm"
          aria-label="Search contacts"
        />
        <label className="flex items-center gap-2 text-small text-ink-2">
          <input
            type="checkbox"
            checked={bouncedOnly}
            onChange={(e) => setBouncedOnly(e.target.checked)}
            className="h-4 w-4 accent-bordeaux"
          />
          Bounced only
        </label>
      </div>

      {status === "error" ? (
        <Alert tone="danger" className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>We hit a snag loading the contact pool. {error?.message ?? ""}</span>
            <Button size="sm" variant="secondary" onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {status === "loading" || status === "idle" ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading contacts">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : status === "ready" && items.length === 0 ? (
        <EmptyState
          title={bouncedOnly ? "No bounced contacts — your pool is clean." : "No contacts yet."}
        />
      ) : status === "ready" ? (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-md border border-line">
            <table className="w-full text-small">
              <thead className="bg-paper-2 text-ink-2">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Company</th>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-line hover:bg-paper-2">
                    <td className="px-4 py-3 text-ink">{row.email}</td>
                    <td className="px-4 py-3 text-ink-2">{row.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-2">
                      {row.company_name}
                      <span className="block text-caption text-ink-3">{row.company_domain}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-3">{row.source ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.is_invalid ? (
                        <Badge tone="bordeaux">{bounceLabel(row.invalid_reason)}</Badge>
                      ) : (
                        <Badge tone="moss">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <InlineConfirm
                        label="Delete"
                        variant="destructive"
                        question={`Delete ${row.email}?`}
                        confirmLabel="Delete"
                        onConfirm={() => handleDelete(row)}
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-body text-ink">{row.email}</div>
                    <div className="truncate text-caption text-ink-3">
                      {row.name ? `${row.name} · ` : ""}
                      {row.company_name}
                    </div>
                  </div>
                  {row.is_invalid ? (
                    <Badge tone="bordeaux">{bounceLabel(row.invalid_reason)}</Badge>
                  ) : (
                    <Badge tone="moss">Active</Badge>
                  )}
                </div>
                <div className="mt-2">
                  <InlineConfirm
                    label="Delete"
                    variant="destructive"
                    question={`Delete ${row.email}?`}
                    confirmLabel="Delete"
                    onConfirm={() => handleDelete(row)}
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
    </div>
  );
}
