"use client";

import { useCallback, useEffect, useState } from "react";
import { listUsers, type UsersTab } from "@/lib/admin/users";
import type { AdminUserOut, Page, Tier } from "@/lib/admin/types";
import { ApiError } from "@/lib/api/errors";

const PAGE_SIZE = 50;

interface UseUsersArgs {
  tab: UsersTab;
  search: string;
  offset: number;
}

interface UseUsersResult {
  status: "idle" | "loading" | "ready" | "error";
  page: Page<AdminUserOut> | null;
  /** Filtered items — applies tab-specific client-side rules (suspended split). */
  items: AdminUserOut[];
  error: ApiError | null;
  reload: () => void;
}

/** Map a UI tab to the backend tier filter (or none for "all"). */
export function tierFilterForTab(tab: UsersTab): Tier | undefined {
  switch (tab) {
    case "pending":
      return "pending";
    case "free":
      return "free";
    case "paid":
      return "paid";
    case "suspended":
      // Suspended users keep their pre-suspend tier; backend has no `?suspended=true`.
      // We pull the broader set client-side and filter by is_suspended below.
      return undefined;
    case "all":
    default:
      return undefined;
  }
}

export function useUsers({ tab, search, offset }: UseUsersArgs): UseUsersResult {
  const [page, setPage] = useState<Page<AdminUserOut> | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    const tier = tierFilterForTab(tab);
    listUsers({ tier, search: search || undefined, limit: PAGE_SIZE, offset })
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
  }, [tab, search, offset, reloadKey]);

  // Client-side filter by is_suspended for the Pending and Suspended tabs.
  const items = (() => {
    if (!page) return [];
    if (tab === "pending") return page.items.filter((u) => !u.is_suspended);
    if (tab === "suspended") return page.items.filter((u) => u.is_suspended);
    return page.items;
  })();

  return { status, page, items, error, reload };
}

export const USERS_PAGE_SIZE = PAGE_SIZE;
