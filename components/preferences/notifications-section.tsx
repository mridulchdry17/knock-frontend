"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PreferencesSection } from "@/components/preferences/section";
import type { Preferences } from "@/lib/preferences/types";
import type { PreferencesMutations } from "@/lib/preferences/use-preferences";

interface NotificationsSectionProps {
  prefs: Preferences;
  mutations: PreferencesMutations;
  /** When true, the daily-summary toggle is shown (paid + autopilot only). */
  showDailySummary: boolean;
}

type Permission = "default" | "granted" | "denied" | "unsupported";

function readPermission(): Permission {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return window.Notification.permission as Permission;
}

export function NotificationsSection({
  prefs,
  mutations,
  showDailySummary,
}: NotificationsSectionProps) {
  const [permission, setPermission] = useState<Permission>("unsupported");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPermission(readPermission());
  }, []);

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setRequesting(true);
    try {
      const next = await window.Notification.requestPermission();
      setPermission(next as Permission);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <PreferencesSection
      id="notifications"
      title="How we'll keep in touch"
      subtitle="Pick the moments worth pinging you about."
    >
      <div className="space-y-5">
        <ToggleRow
          id="notify-gmail-disconnect"
          label="Email me when Gmail disconnects"
          checked={prefs.notify_gmail_disconnect}
          onCheckedChange={(checked) => {
            mutations.update({ notify_gmail_disconnect: checked });
            void mutations.flush();
          }}
        />

        {showDailySummary ? (
          <ToggleRow
            id="notify-daily-summary"
            label="Email me daily summaries"
            description="End-of-day recap of what autopilot sent."
            checked={prefs.notify_daily_summary}
            onCheckedChange={(checked) => {
              mutations.update({ notify_daily_summary: checked });
              void mutations.flush();
            }}
          />
        ) : null}

        {permission !== "unsupported" ? (
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="min-w-0">
              <div className="text-small font-medium text-ink">Browser notifications</div>
              {permission === "granted" ? (
                <div className="mt-1 text-small text-ink-2">Browser notifications on</div>
              ) : permission === "denied" ? (
                <div className="mt-1 text-small text-ink-3">
                  Notifications denied — enable in browser settings
                </div>
              ) : (
                <div className="mt-1 text-small text-ink-3">
                  Get a quick ping when your batch is ready.
                </div>
              )}
            </div>
            {permission === "default" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void requestPermission()}
                disabled={requesting}
              >
                Enable browser notifications
              </Button>
            ) : permission === "denied" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void requestPermission()}
                disabled={requesting}
              >
                Re-request
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PreferencesSection>
  );
}

interface ToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ToggleRow({ id, label, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-small font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-1 text-small text-ink-3">{description}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}
