"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { PreferencesSection } from "@/components/preferences/section";
import { ToggleRow } from "@/components/preferences/notifications-section";
import { useAuth } from "@/components/auth/auth-context";
import { fetchTemplates } from "@/lib/templates/client";
import { fetchTodayBatch } from "@/lib/today/client";
import type { Preferences } from "@/lib/preferences/types";
import type { PreferencesMutations } from "@/lib/preferences/use-preferences";
import type { Template } from "@/lib/templates/types";
import type { TodayItem } from "@/lib/today/types";

interface AutopilotSectionProps {
  prefs: Preferences;
  mutations: PreferencesMutations;
}

export function AutopilotSection({ prefs, mutations }: AutopilotSectionProps) {
  const { refresh } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Preview state — populated when the dialog opens so the user sees the
  // template that will be used + the first 3 emails before committing.
  const [defaultTemplate, setDefaultTemplate] = useState<Template | null>(null);
  const [previewItems, setPreviewItems] = useState<TodayItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    let cancelled = false;
    setPreviewLoading(true);
    Promise.all([fetchTemplates(), fetchTodayBatch()])
      .then(([tplRes, todayRes]) => {
        if (cancelled) return;
        if (tplRes.kind === "list") {
          const def = tplRes.data.items.find((t) => t.is_default);
          setDefaultTemplate(def ?? tplRes.data.items[0] ?? null);
        }
        if (todayRes.kind === "batch") {
          setPreviewItems(todayRes.data.items.slice(0, 3));
        } else {
          setPreviewItems([]);
        }
      })
      .catch(() => {
        // Don't block the user — preview is optional, the toggle still works
        // even if the fetch hiccups.
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [confirmOpen]);

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

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !submitting && setConfirmOpen(open)}
      >
        <DialogContent
          aria-describedby="autopilot-confirm-desc"
          className="max-w-[560px]"
        >
          <DialogHeader>
            <DialogTitle>Turn on autopilot?</DialogTitle>
            <DialogDescription id="autopilot-confirm-desc">
              {defaultTemplate ? (
                <>
                  Autopilot will send up to 15 emails every day, starting
                  tomorrow at 6am, using your{" "}
                  <span className="inline-flex items-center gap-1 font-medium text-ink">
                    <Star size={12} className="fill-ember text-ember" aria-hidden />
                    {defaultTemplate.name}
                  </span>{" "}
                  template.
                </>
              ) : (
                "Autopilot will send up to 15 emails every day, starting tomorrow at 6am, using your saved templates."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <p className="text-small text-ink-2">
              {previewItems.length > 0
                ? "Here's what the first 3 emails look like:"
                : previewLoading
                  ? null
                  : "Your first batch lands tomorrow morning."}
            </p>
            {previewLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : previewItems.length > 0 ? (
              <ul className="space-y-2">
                {previewItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-line bg-paper-2 p-3 text-small"
                  >
                    <p className="font-medium text-ink">
                      {item.recipient.name ?? item.recipient.email}
                      {item.recipient.role || item.recipient.company ? (
                        <span className="font-normal text-ink-3">
                          {" · "}
                          {[item.recipient.role, item.recipient.company]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-ink-2">
                      {item.body_preview}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmOpen(false);
                // Hard-nav so /templates remounts cleanly and we don't
                // depend on next/navigation's router being mounted (avoids
                // a known invariant-fail in component-level tests).
                if (typeof window !== "undefined") {
                  window.location.href = "/templates";
                }
              }}
              disabled={submitting}
            >
              Change template
            </Button>
            <div className="flex-1" />
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
              {submitting ? "Enabling…" : "Turn on autopilot"}
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
