"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken } from "@/lib/auth/token";
import { refreshAccessToken } from "@/lib/auth/refresh";
import { fetchCurrentUser } from "@/lib/auth/me";
import { logout as apiLogout } from "@/lib/auth/onboarding";
import { GMAIL_REAUTH_EVENT } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/auth/types";

type Status = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: CurrentUser | null;
  status: Status;
  hasToken: boolean;
  /** True iff a 401 from /api/v1/* signaled Gmail-token revoked but session is alive. */
  gmailReauthRequired: boolean;
  /** True iff /me says the user explicitly disconnected Gmail (or never connected). */
  gmailDisconnected: boolean;
  refresh: () => Promise<void>;
  /** Clear the reauth flag — called once /connect-gmail completes successfully. */
  clearReauthFlag: () => void;
  /**
   * Local sign-out: clears token + state and hard-redirects to "/".
   * Does NOT call the backend — use `signOutRemote()` for that.
   */
  signOut: () => void;
  /**
   * Calls POST /api/v1/auth/logout (best-effort), then locally signs out.
   * Defensive: if the backend is unreachable, still wipes local token + redirects.
   */
  signOutRemote: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [hasToken, setHasToken] = useState(false);
  const [gmailReauthRequired, setGmailReauthRequired] = useState(false);

  const refresh = useCallback(async () => {
    setStatus("loading");

    // auth-v1: the access token lives in memory only, so on app boot it's
    // always cold. Try a silent refresh first — if the HttpOnly refresh
    // cookie is still valid, we get a fresh access token without ever
    // showing a login screen. If it's gone (logged out, expired past
    // 30 days, family revoked), null comes back and we render the
    // unauthenticated tree.
    let token = getToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    setHasToken(Boolean(token));
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authenticated");
      // /me succeeded under a stored token — Gmail token must be live too.
      // (If it weren't, the backend would have 401'd this very request.)
      if (me.gmail_connected) setGmailReauthRequired(false);
    } catch {
      // apiFetch already cleared the token on 401-session-dead, or surfaced
      // a reauth event. We just resync local state.
      setUser(null);
      setHasToken(Boolean(getToken()));
      setStatus("unauthenticated");
    }
  }, []);

  const clearReauthFlag = useCallback(() => {
    setGmailReauthRequired(false);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setHasToken(false);
    setGmailReauthRequired(false);
    setStatus("unauthenticated");
    if (typeof window !== "undefined") window.location.href = "/";
  }, []);

  const signOutRemote = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Defensive: backend down shouldn't strand the user. Local wipe still happens.
    }
    signOut();
  }, [signOut]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Listen for soft-401 from apiFetch — Gmail revoked, session alive.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onReauth = () => setGmailReauthRequired(true);
    window.addEventListener(GMAIL_REAUTH_EVENT, onReauth);
    return () => window.removeEventListener(GMAIL_REAUTH_EVENT, onReauth);
  }, []);

  const gmailDisconnected = Boolean(user && !user.gmail_connected);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      hasToken,
      gmailReauthRequired,
      gmailDisconnected,
      refresh,
      clearReauthFlag,
      signOut,
      signOutRemote,
    }),
    [
      user,
      status,
      hasToken,
      gmailReauthRequired,
      gmailDisconnected,
      refresh,
      clearReauthFlag,
      signOut,
      signOutRemote,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
