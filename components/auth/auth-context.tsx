"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken } from "@/lib/auth/token";
import { fetchCurrentUser } from "@/lib/auth/me";
import type { CurrentUser } from "@/lib/auth/types";

type Status = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: CurrentUser | null;
  status: Status;
  hasToken: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [hasToken, setHasToken] = useState(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    setHasToken(Boolean(token));
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    setStatus("loading");
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authenticated");
    } catch {
      // apiFetch already cleared the token on 401 and surfaces the redirect.
      setUser(null);
      setHasToken(false);
      setStatus("unauthenticated");
    }
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setHasToken(false);
    setStatus("unauthenticated");
    if (typeof window !== "undefined") window.location.href = "/";
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, hasToken, refresh, signOut }),
    [user, status, hasToken, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
