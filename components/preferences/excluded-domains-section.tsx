"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/errors";
import { PreferencesSection } from "@/components/preferences/section";
import type { ExcludedDomain } from "@/lib/preferences/types";
import type { PreferencesMutations } from "@/lib/preferences/use-preferences";

interface ExcludedDomainsSectionProps {
  excludedDomains: ExcludedDomain[];
  mutations: PreferencesMutations;
}

const DOMAIN_RE = /^@?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function ExcludedDomainsSection({
  excludedDomains,
  mutations,
}: ExcludedDomainsSectionProps) {
  const [draft, setDraft] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    const value = draft.trim();
    if (!value) return;
    if (!DOMAIN_RE.test(value)) {
      setInlineError("That doesn't look like a valid domain.");
      return;
    }
    setInlineError(null);
    setSubmitting(true);
    try {
      await mutations.addDomain(value);
      setDraft("");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "invalid_domain") {
          setInlineError("That doesn't look like a valid domain.");
        } else if (err.code === "already_excluded") {
          setInlineError("That's already on your list.");
        } else {
          toast("We hit a snag. Try again in a moment.");
        }
      } else {
        toast("We hit a snag. Try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(domain: string) {
    try {
      await mutations.removeDomain(domain);
    } catch {
      toast("We hit a snag. Try again in a moment.");
    }
  }

  return (
    <PreferencesSection
      id="excluded-domains"
      title="Domains to skip"
      subtitle="You'll never email anyone @these domains."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (inlineError) setInlineError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="@domain.com"
            aria-label="Domain to exclude"
            aria-invalid={Boolean(inlineError)}
            aria-describedby={inlineError ? "excluded-domain-error" : undefined}
          />
          <Button
            type="button"
            variant="primary"
            disabled={submitting || draft.trim() === ""}
            onClick={() => void handleAdd()}
          >
            Add
          </Button>
        </div>
        {inlineError ? (
          <p id="excluded-domain-error" className="text-small text-bordeaux">
            {inlineError}
          </p>
        ) : null}

        {excludedDomains.length === 0 ? (
          <p className="text-small text-ink-3">No exclusions yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Excluded domains">
            {excludedDomains.map((d) => (
              <li
                key={d.domain}
                className="inline-flex items-center gap-2 rounded-pill border border-line-2 bg-paper-2 px-3 py-1 text-small text-ink"
              >
                <span>{d.domain}</span>
                <button
                  type="button"
                  onClick={() => void handleRemove(d.domain)}
                  className="text-ink-3 transition-colors hover:text-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
                  aria-label={`Remove ${d.domain}`}
                >
                  <X size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PreferencesSection>
  );
}
