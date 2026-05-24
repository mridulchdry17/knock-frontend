import { cn } from "@/lib/utils";
import { LandingVariableChip } from "./landing-variable-chip";

/**
 * The hero artifact: "write it once → it lands as a real email for each person."
 *
 * Shows the product's ACTUAL personalization mechanic — one sentence the student
 * wrote, with {{first_name}}/{{company}}/{{role}} chips, resolving into per-
 * recipient cards where ONLY those details change and the prose stays identical.
 * That fixed prose is the whole point: it proves the words are theirs (not AI-
 * generated, not a different blast per person). Decorative — aria-hidden, the
 * hero <h1>/subhead carry the meaning for assistive tech.
 *
 * Pure markup + the existing opacity-only `animate-fade-in` keyframe (safe under
 * prefers-reduced-motion — the end state is fully-visible content).
 */

interface Recipient {
  first_name: string;
  company: string;
  role: string;
}

const DEFAULT_RECIPIENTS: Recipient[] = [
  { first_name: "Priya", company: "Figma", role: "design" },
  { first_name: "Dev", company: "Stripe", role: "payments" },
];

/** Split the template into text + chip atoms (no regex libs; mirrors the
 *  in-app renderWithVariables). The regex only captures the three real
 *  variables, so the capture is safely one of the chip names. */
function withChips(text: string) {
  return text.split(/(\{\{\s*[a-z_]+\s*\}\})/g).map((seg, i) => {
    const m = seg.match(/\{\{\s*(first_name|company|role)\s*\}\}/);
    return m ? (
      <LandingVariableChip key={i} name={m[1] as "first_name" | "company" | "role"} />
    ) : (
      <span key={i}>{seg}</span>
    );
  });
}

const TEMPLATE =
  "Hi {{first_name}} — I've been rebuilding my portfolio and saw {{company}}'s work. Could I ask you one question about breaking into {{role}}?";

export function TemplateResolve({
  recipients = DEFAULT_RECIPIENTS,
  className,
}: {
  recipients?: Recipient[];
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "w-full rounded-lg border border-line bg-paper p-card shadow-sm",
        className,
      )}
    >
      {/* the one sentence you write, in your words */}
      <p className="font-mono text-caption uppercase text-ink-3">
        The message you write
      </p>
      <p className="mt-2 text-small leading-relaxed text-ink">{withChips(TEMPLATE)}</p>

      {/* divider */}
      <div className="my-4 flex items-center gap-2 border-t border-line pt-3">
        <span className="font-mono text-caption uppercase text-flint">Becomes</span>
        <span aria-hidden="true" className="text-line-2">
          —
        </span>
        <span className="font-mono text-caption text-ink-3">
          {recipients.length} emails, each one theirs
        </span>
      </div>

      {/* resolved cards — same sentence, only the details filled in */}
      <div className="space-y-2">
        {recipients.map((r, i) => (
          <div
            key={r.first_name}
            className="animate-fade-in rounded-md border border-line bg-paper-2 p-3"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            <p className="text-caption text-ink-3">
              To {r.first_name} · <span className="text-ink-2">{r.company}</span>
            </p>
            <p className="mt-1 text-small leading-relaxed text-ink">
              Hi <span className="font-medium">{r.first_name}</span> — I&apos;ve been
              rebuilding my portfolio and saw{" "}
              <span className="font-medium">{r.company}</span>&apos;s work. Could I ask
              you one question about breaking into {r.role}?
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
