"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import {
  createTemplate as apiCreate,
  deleteTemplate as apiDelete,
  fetchTemplates,
  testSendTemplate as apiTestSend,
  updateTemplate as apiUpdate,
} from "@/lib/templates/client";
import type {
  Template,
  TemplateInput,
  TemplatePatch,
  TemplatesList,
  TestSendResult,
} from "@/lib/templates/types";

/**
 * Top-level UI status for /templates.
 *
 *  - loading       first paint, no data yet
 *  - empty         200 with items=[] OR 502 unavailable — same calm
 *                  "Setting up your starter templates…" state per spec
 *  - populated     items present
 *  - error         any other 4xx/5xx
 */
export type TemplatesStatus = "loading" | "empty" | "populated" | "error";

export interface TemplateMutations {
  create: (input: TemplateInput) => Promise<Template>;
  update: (id: string, patch: TemplatePatch) => Promise<Template>;
  remove: (id: string) => Promise<void>;
  testSend: (id: string) => Promise<TestSendResult>;
}

export interface UseTemplatesResult {
  status: TemplatesStatus;
  items: Template[];
  count: number;
  cap: number;
  /** True when count >= cap. Used for "+ New template" disabled state. */
  atCap: boolean;
  error: ApiError | null;
  refresh: () => void;
  mutations: TemplateMutations;
}

const DEFAULT_CAP = 3;

export function useTemplates(): UseTemplatesResult {
  const [status, setStatus] = useState<TemplatesStatus>("loading");
  const [list, setList] = useState<TemplatesList>({
    items: [],
    count: 0,
    cap: DEFAULT_CAP,
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Live ref so optimistic mutations can capture true pre-mutation snapshots
  // without racing setState batching (mirrors useToday's pattern).
  const listRef = useRef<TemplatesList>(list);
  listRef.current = list;

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetchTemplates()
      .then((res) => {
        if (cancelled) return;
        if (res.kind === "unavailable") {
          setList({ items: [], count: 0, cap: DEFAULT_CAP });
          setStatus("empty");
          return;
        }
        if (res.kind === "error") {
          setError(res.error);
          setStatus("error");
          return;
        }
        setList(res.data);
        setStatus(res.data.items.length === 0 ? "empty" : "populated");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown", "We hit a snag loading templates."),
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const setListBoth = useCallback((next: TemplatesList) => {
    listRef.current = next;
    setList(next);
    setStatus(next.items.length === 0 ? "empty" : "populated");
  }, []);

  const create = useCallback(
    async (input: TemplateInput): Promise<Template> => {
      // Optimistic: insert a placeholder; replace with server canonical on success.
      const snapshot = listRef.current;
      const tempId = `tmp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic: Template = {
        id: tempId,
        name: input.name,
        subject: input.subject,
        body: input.body,
        is_starter: false,
        used_count: 0,
        reply_rate: null,
        created_at: now,
        updated_at: now,
      };
      setListBoth({
        items: [...snapshot.items, optimistic],
        count: snapshot.count + 1,
        cap: snapshot.cap,
      });
      try {
        const created = await apiCreate(input);
        const cur = listRef.current;
        const nextItems = cur.items.map((t) => (t.id === tempId ? created : t));
        setListBoth({ ...cur, items: nextItems });
        return created;
      } catch (err) {
        setListBoth(snapshot);
        throw err;
      }
    },
    [setListBoth],
  );

  const update = useCallback(
    async (id: string, patch: TemplatePatch): Promise<Template> => {
      const snapshot = listRef.current;
      const idx = snapshot.items.findIndex((t) => t.id === id);
      if (idx < 0) {
        throw new ApiError(404, "not_found", "Template not found.");
      }
      const prior = snapshot.items[idx];
      const optimistic: Template = {
        ...prior,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
        ...(patch.body !== undefined ? { body: patch.body } : {}),
        updated_at: new Date().toISOString(),
      };
      const nextItems = snapshot.items.slice();
      nextItems[idx] = optimistic;
      setListBoth({ ...snapshot, items: nextItems });
      try {
        const updated = await apiUpdate(id, patch);
        const cur = listRef.current;
        const ix = cur.items.findIndex((t) => t.id === id);
        if (ix >= 0) {
          const items = cur.items.slice();
          items[ix] = updated;
          setListBoth({ ...cur, items });
        }
        return updated;
      } catch (err) {
        setListBoth(snapshot);
        throw err;
      }
    },
    [setListBoth],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const snapshot = listRef.current;
      const next = snapshot.items.filter((t) => t.id !== id);
      setListBoth({ ...snapshot, items: next, count: next.length });
      try {
        await apiDelete(id);
      } catch (err) {
        setListBoth(snapshot);
        throw err;
      }
    },
    [setListBoth],
  );

  const testSend = useCallback(async (id: string) => {
    return apiTestSend(id);
  }, []);

  const atCap = list.count >= list.cap;

  return {
    status,
    items: list.items,
    count: list.count,
    cap: list.cap,
    atCap,
    error,
    refresh,
    mutations: { create, update, remove, testSend },
  };
}
