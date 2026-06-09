"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";
import { PreferencesSection } from "@/components/preferences/section";
import { ToggleRow } from "@/components/preferences/notifications-section";
import { useAuth } from "@/components/auth/auth-context";
import type { Preferences } from "@/lib/preferences/types";
import type { PreferencesMutations } from "@/lib/preferences/use-preferences";

interface AutopilotSectionProps {
  prefs: Preferences;
  mutations: PreferencesMutations;
}

export function AutopilotSection({ prefs, mutations }: AutopilotSectionProps) {
  const { refresh } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function turnOn() {
    setSubmitting(true);
    try {
      await mutations.enableAutopilot();
      await refresh();
      toast("Autopilot's on. First batch goes out tomorrow at 6am.");
      setConfirmOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "paid_required") {
        toast("Autopilot is a paid feature.");
      } else {
        toast("We hit a snag. Try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function turnOff() {
    try {
      await mutations.disableAutopilot();
      await refresh();
      toast("Switched to manual review.");
    } catch {
      toast("We hit a snag. Try again in a moment.");
    }
  }

  function handleRadioChange(next: "manual" | "autopilot") {
    if (next === "autopilot" && !prefs.autopilot_enabled) {
      setConfirmOpen(true);
    } else if (next === "manual" && prefs.autopilot_enabled) {
      void turnOff();
    }
  }

  return (
    <PreferencesSection
      id="autopilot"
      title="Autopilot"
      subtitle="Default = manual review. Autopilot fires up to 20/day automatically using your templates."
    >
      <div role="radiogroup" aria-label="Send mode" className="space-y-3">
        <RadioOption
          name="autopilot-mode"
          value="manual"
          checked={!prefs.autopilot_enabled}
          onChange={() => handleRadioChange("manual")}
          title="Manual review"
          description="You approve each batch."
        />
        <RadioOption
          name="autopilot-mode"
          value="autopilot"
          checked={prefs.autopilot_enabled}
          onChange={() => handleRadioChange("autopilot")}
          title="Autopilot"
          description="Knock sends up to 20/day in your name, using your saved templates."
        />
      </div>

      {prefs.autopilot_enabled ? (
        <div className="mt-6 space-y-4 border-t border-line pt-5">
          <ToggleRow
            id="autopilot-pause-on-reply"
            label="Pause sends to a company for 7 days if they reply"
            checked={prefs.autopilot_auto_pause_on_reply}
            onCheckedChange={(checked) => {
              mutations.update({ autopilot_auto_pause_on_reply: checked });
              void mutations.flush();
            }}
          />
          <ToggleRow
            id="autopilot-daily-summary"
            label="Email me a daily summary of what was sent"
            checked={prefs.notify_daily_summary}
            onCheckedChange={(checked) => {
              mutations.update({ notify_daily_summary: checked });
              void mutations.flush();
            }}
          />
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <DialogContent aria-describedby="autopilot-confirm-desc">
          <DialogHeader>
            <DialogTitle>Turn on autopilot?</DialogTitle>
            <DialogDescription id="autopilot-confirm-desc">
              We&apos;ll send up to 20 emails per day in your name, using your saved
              templates. You can pause anytime from /today.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void turnOn()}
              disabled={submitting}
            >
              {submitting ? "Enabling…" : "Enable autopilot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PreferencesSection>
  );
}

interface RadioOptionProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}

function RadioOption({ name, value, checked, onChange, title, description }: RadioOptionProps) {
  return (
    <label
      className={
        "flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors " +
        (checked ? "border-flint bg-flint/5" : "border-line-2 hover:bg-paper-2")
      }
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-flint"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-small font-medium text-ink">{title}</span>
        <span className="mt-1 block text-small text-ink-3">{description}</span>
      </span>
    </label>
  );
}
