"use client";

import { useAuth } from "@/components/auth/auth-context";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { SenderPrefsSection } from "@/components/preferences/sender-prefs-section";
import { ExcludedDomainsSection } from "@/components/preferences/excluded-domains-section";
import { NotificationsSection } from "@/components/preferences/notifications-section";
import { AutopilotSection } from "@/components/preferences/autopilot-section";
import { AccountSection } from "@/components/preferences/account-section";
import { Skeleton } from "@/components/ui/skeleton";

export function PreferencesView() {
  const { user } = useAuth();
  const { status, prefs, excludedDomains, saveState, error, mutations } = usePreferences();

  const isPaid = user?.tier === "paid" || user?.tier === "super_admin";
  const showDailySummary = isPaid && prefs.autopilot_enabled;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-2">
        <h1 className="text-h1 text-ink">Preferences</h1>
        <p className="mt-2 text-small text-ink-3">
          Settings for who Knock reaches out to and how we&apos;ll keep in touch.
        </p>
      </header>

      {status === "loading" ? (
        <div className="space-y-6 pt-6" aria-busy="true">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : status === "error" && error ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-bordeaux/40 bg-bordeaux-tint p-4 text-small text-ink"
        >
          We hit a snag loading your preferences. Try again in a moment.
        </div>
      ) : (
        <div className="mt-2">
          <SenderPrefsSection prefs={prefs} mutations={mutations} saveState={saveState} />
          <ExcludedDomainsSection excludedDomains={excludedDomains} mutations={mutations} />
          <NotificationsSection
            prefs={prefs}
            mutations={mutations}
            showDailySummary={showDailySummary}
          />
          {isPaid ? <AutopilotSection prefs={prefs} mutations={mutations} /> : null}
          <AccountSection />
        </div>
      )}
    </div>
  );
}
