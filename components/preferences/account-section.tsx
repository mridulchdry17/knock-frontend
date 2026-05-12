"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-context";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { startGmailOAuth } from "@/lib/auth/gmail";
import { PreferencesSection } from "@/components/preferences/section";
import { DisconnectGmailDialog } from "@/components/knock/disconnect-gmail-dialog";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Paper" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function AccountSection() {
  const { user, signOutRemote } = useAuth();
  const { theme, setTheme } = useTheme();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    toast("Signed out. Come back soon.");
    await signOutRemote();
  }

  return (
    <PreferencesSection id="account" title="Account" subtitle="Connections, theme, and the door.">
      <div className="space-y-6">
        {/* Gmail row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-small font-medium text-ink">Connected Gmail</div>
            <div className="mt-1 flex items-center gap-2 text-small text-ink-2">
              {user.gmail_connected ? (
                <>
                  <span aria-hidden className="inline-block h-2 w-2 rounded-pill bg-ember" />
                  <span className="truncate">{user.email}</span>
                  <span className="text-ink-3">·</span>
                  <span className="text-ink-3">Connected</span>
                </>
              ) : (
                <span className="text-ink-3">Not connected</span>
              )}
            </div>
          </div>
          {user.gmail_connected ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-bordeaux hover:bg-bordeaux-tint"
              onClick={() => setDisconnectOpen(true)}
            >
              Disconnect Gmail
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => startGmailOAuth("/preferences")}>
              Connect Gmail
            </Button>
          )}
        </div>

        {/* Theme row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-small font-medium text-ink">Theme</div>
            <div className="mt-1 text-small text-ink-3">
              Paper is the default. Dark mirrors it inverted; System follows your OS.
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex rounded-md border border-line-2 bg-paper-2 p-0.5"
          >
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-small transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    active
                      ? "bg-paper text-ink shadow-xs"
                      : "text-ink-3 hover:text-ink",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign out */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full text-bordeaux hover:bg-bordeaux-tint sm:w-auto"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </Button>
        </div>
      </div>

      <DisconnectGmailDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        describedById="prefs-disconnect-desc"
      />
    </PreferencesSection>
  );
}
