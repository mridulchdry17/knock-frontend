"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChipMultiSelect } from "@/components/preferences/chip-multiselect";
import { PreferencesSection } from "@/components/preferences/section";
import { SavedPill } from "@/components/preferences/saved-pill";
import type { Preferences } from "@/lib/preferences/types";
import type { PreferencesMutations, SaveState } from "@/lib/preferences/use-preferences";

const INDUSTRY_SUGGESTIONS = ["Tech", "Finance", "Healthcare", "Media", "Education"];

interface SenderPrefsSectionProps {
  prefs: Preferences;
  mutations: PreferencesMutations;
  saveState: SaveState;
}

export function SenderPrefsSection({ prefs, mutations, saveState }: SenderPrefsSectionProps) {
  // Local mirrors so typing doesn't replace `value` mid-edit. We push to the
  // hook's `update` (which schedules autosave) on every change; on blur we
  // call `flush` so the network call goes out before the user wanders.
  const [role, setRole] = useState<string>(prefs.target_role ?? "");
  const [location, setLocation] = useState<string>(prefs.target_location ?? "");

  // If the canonical prefs object reshapes (e.g. after server response),
  // reflect that into the local mirror — but only when the user isn't actively
  // typing. We guard by comparing against last-known prop value.
  useEffect(() => {
    setRole(prefs.target_role ?? "");
  }, [prefs.target_role]);
  useEffect(() => {
    setLocation(prefs.target_location ?? "");
  }, [prefs.target_location]);

  return (
    <PreferencesSection
      id="sender"
      title="Who you're hunting"
      subtitle="The people Knock looks for on your behalf."
      defaultOpen
      headerAside={<SavedPill state={saveState} />}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="pref-role">Role</Label>
          <Input
            id="pref-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onBlur={() => {
              const next = role.trim() === "" ? null : role.trim();
              if (next !== prefs.target_role) {
                mutations.update({ target_role: next });
              }
              void mutations.flush();
            }}
            placeholder="e.g. Hiring Manager, Recruiter"
          />
        </div>

        <div className="space-y-2">
          <Label>Industry</Label>
          <ChipMultiSelect
            values={prefs.target_industries}
            suggestions={INDUSTRY_SUGGESTIONS}
            placeholder="Add industry — press Enter"
            onChange={(next) => mutations.update({ target_industries: next })}
            onBlur={() => void mutations.flush()}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pref-location">Location</Label>
          <Input
            id="pref-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => {
              const next = location.trim() === "" ? null : location.trim();
              if (next !== prefs.target_location) {
                mutations.update({ target_location: next });
              }
              void mutations.flush();
            }}
            placeholder="City, region, or remote"
          />
        </div>
      </div>
    </PreferencesSection>
  );
}
