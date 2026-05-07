"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import {
  addExcludedDomain as apiAddDomain,
  disableAutopilot as apiDisable,
  enableAutopilot as apiEnable,
  fetchExcludedDomains,
  fetchPreferences,
  removeExcludedDomain as apiRemoveDomain,
  updatePreferences as apiUpdate,
} from "@/lib/preferences/client";
import {
  DEFAULT_PREFERENCES,
  type ExcludedDomain,
  type Preferences,
  type PreferencesPatch,
} from "@/lib/preferences/types";

/**
 * Top-level UI status for /preferences.
 *  - loading       initial fetch in flight
 *  - ready         data on hand (live or defaults from 502)
 *  - error         non-502 failure
 */
export type PreferencesStatus = "loading" | "ready" | "error";

/** Save state surfaced for the "Saved" 13px microcopy that fades after 2s. */
export type SaveState = "idle" | "saving" | "saved";

const AUTOSAVE_DEBOUNCE_MS = 800;
const SAVED_FADE_MS = 2000;

export interface PreferencesMutations {
  /** Merge a partial patch into local state and schedule a debounced save. */
  update: (patch: PreferencesPatch) => void;
  /** Force-flush any pending debounced save (called on blur / before unload). */
  flush: () => Promise<void>;
  addDomain: (domain: string) => Promise<ExcludedDomain>;
  removeDomain: (domain: string) => Promise<void>;
  enableAutopilot: () => Promise<void>;
  disableAutopilot: () => Promise<void>;
}

export interface UsePreferencesResult {
  status: PreferencesStatus;
  prefs: Preferences;
  excludedDomains: ExcludedDomain[];
  saveState: SaveState;
  error: ApiError | null;
  mutations: PreferencesMutations;
}

export function usePreferences(): UsePreferencesResult {
  const [status, setStatus] = useState<PreferencesStatus>("loading");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [excludedDomains, setExcludedDomains] = useState<ExcludedDomain[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<ApiError | null>(null);

  const prefsRef = useRef<Preferences>(prefs);
  prefsRef.current = prefs;

  const pendingPatchRef = useRef<PreferencesPatch>({});
  /** Snapshot of prefs taken at the moment a debounced save batch was opened.
   * On failure we restore to this — not to the optimistic state at flush-time. */
  const rollbackSnapshotRef = useRef<Preferences | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial parallel load.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    Promise.all([fetchPreferences(), fetchExcludedDomains()])
      .then(([pRes, dRes]) => {
        if (cancelled) return;
        if (pRes.kind === "error") {
          setError(pRes.error);
          setStatus("error");
          return;
        }
        const data = pRes.kind === "loaded" ? pRes.data : DEFAULT_PREFERENCES;
        setPrefs(data);
        prefsRef.current = data;

        if (dRes.kind === "loaded") {
          setExcludedDomains(dRes.data.items);
        } else {
          setExcludedDomains([]);
        }
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError(0, "unknown", "We hit a snag loading preferences."),
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const flush = useCallback(async (): Promise<void> => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const patch = pendingPatchRef.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatchRef.current = {};

    const snapshot = rollbackSnapshotRef.current ?? prefsRef.current;
    rollbackSnapshotRef.current = null;
    setSaveState("saving");
    try {
      const next = await apiUpdate(patch);
      prefsRef.current = next;
      setPrefs(next);
      setSaveState("saved");
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => setSaveState("idle"), SAVED_FADE_MS);
    } catch (err) {
      // Rollback to the pre-mutation snapshot captured when this batch opened.
      prefsRef.current = snapshot;
      setPrefs(snapshot);
      setSaveState("idle");
      throw err;
    }
  }, []);

  const update = useCallback((patch: PreferencesPatch): void => {
    // Capture the rollback snapshot the first time a batch opens — subsequent
    // calls within the same debounce window stack onto the same snapshot.
    if (rollbackSnapshotRef.current === null) {
      rollbackSnapshotRef.current = prefsRef.current;
    }

    // Optimistic local merge so the UI feels instant.
    const next: Preferences = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);

    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void flush().catch(() => {
        // flush() already handled rollback + cleared saveState. No toast here —
        // the autosave field-level UX stays calm; the next attempt will retry.
      });
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [flush]);

  const addDomain = useCallback(async (raw: string): Promise<ExcludedDomain> => {
    // Don't optimistically push — the server normalizes + assigns created_at,
    // and 422/409 paths show inline errors. Add only on success.
    const created = await apiAddDomain(raw);
    setExcludedDomains((prev) => [...prev, created]);
    return created;
  }, []);

  const removeDomain = useCallback(async (domain: string): Promise<void> => {
    const snapshot = excludedDomains;
    setExcludedDomains(snapshot.filter((d) => d.domain !== domain));
    try {
      await apiRemoveDomain(domain);
    } catch (err) {
      setExcludedDomains(snapshot);
      throw err;
    }
  }, [excludedDomains]);

  const enableAutopilot = useCallback(async (): Promise<void> => {
    const snapshot = prefsRef.current;
    const optimistic = { ...snapshot, autopilot_enabled: true };
    prefsRef.current = optimistic;
    setPrefs(optimistic);
    try {
      await apiEnable();
    } catch (err) {
      prefsRef.current = snapshot;
      setPrefs(snapshot);
      throw err;
    }
  }, []);

  const disableAutopilot = useCallback(async (): Promise<void> => {
    const snapshot = prefsRef.current;
    const optimistic = { ...snapshot, autopilot_enabled: false };
    prefsRef.current = optimistic;
    setPrefs(optimistic);
    try {
      await apiDisable();
    } catch (err) {
      prefsRef.current = snapshot;
      setPrefs(snapshot);
      throw err;
    }
  }, []);

  // Cleanup pending timers on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return {
    status,
    prefs,
    excludedDomains,
    saveState,
    error,
    mutations: { update, flush, addDomain, removeDomain, enableAutopilot, disableAutopilot },
  };
}
