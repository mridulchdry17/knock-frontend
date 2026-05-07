import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIRS = ["app", "components", "lib"] as const;
// Exclude paths that aren't user-facing (tests, fixtures, configs).
const EXCLUDE = [/node_modules/, /\.next/, /\/tests\//, /\.test\.tsx?$/];

function walk(dir: string, acc: string[] = []): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    const full = path.join(ROOT, rel);
    if (EXCLUDE.some((re) => re.test(full))) continue;
    if (entry.isDirectory()) {
      walk(rel, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const FILES = SOURCE_DIRS.flatMap((d) => walk(d));

function readAll(): { path: string; body: string }[] {
  return FILES.map((p) => ({ path: p, body: fs.readFileSync(p, "utf8") }));
}

// Strip code that isn't user-facing string content: imports, TS types,
// comment blocks. Best-effort — we want to catch obvious drift, not boil
// the ocean.
function stripCode(src: string) {
  return src
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^import .*$/gm, "")
    .replace(/^export .*from .*$/gm, "");
}

describe("microcopy lint", () => {
  const files = readAll();

  // Identifiers / domain code that legitimately contain forbidden words. The
  // lint targets prose; allow these explicit patterns so we don't get noise.
  const FORBIDDEN_ALLOWED = [
    /lib\/api\/proxy\.ts$/, // proxy comments may mention pipeline
  ];

  it("has no forbidden marketing/cheerleader words in prose", () => {
    const forbidden = [
      "leads",
      "prospects",
      "pipeline",
      "campaigns",
      "sequences",
      "cadences",
      "drips",
      "Oops",
      "Whoops",
      "supercharge",
      "growth hack",
    ];
    const hits: string[] = [];
    for (const f of files) {
      if (FORBIDDEN_ALLOWED.some((re) => re.test(f.path))) continue;
      const body = stripCode(f.body);
      for (const word of forbidden) {
        const re = new RegExp(`\\b${word}\\b`, "i");
        if (re.test(body)) {
          hits.push(`${f.path}: ${word}`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it('uses "We hit a snag" voice for error toasts', () => {
    // Spot-check: a sample of snag strings exist in the codebase.
    const all = files.map((f) => f.body).join("\n");
    expect(all).toMatch(/We hit a snag/);
  });

  it("has the locked daily-limit complete strings", () => {
    const all = files.map((f) => f.body).join("\n");
    expect(all).toContain("That's your 7 for today. See you tomorrow.");
    expect(all).toContain("That's your 20 for today. See you tomorrow.");
  });

  it("has the locked approval SLA copy on awaiting-approval", () => {
    const awaiting = files.find((f) => f.path.endsWith("awaiting-approval-client.tsx"));
    expect(awaiting).toBeTruthy();
    expect(awaiting!.body).toContain("We approve in waves");
  });

  it('uses "outreach" only as a verb, never as a noun in prose', () => {
    // Crude check: noun-form usages we know about. Earlier phases shipped
    // a few; F.9 swept them.
    const nounish = ["Cold outreach", "outreach kind"];
    const hits: string[] = [];
    for (const f of files) {
      const body = stripCode(f.body);
      for (const phrase of nounish) {
        if (body.includes(phrase)) hits.push(`${f.path}: ${phrase}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("uses sentence-case for common button labels", () => {
    // Catch obvious Title Case slip-ups on standard verbs.
    const titleCase = [
      ">Send Now<",
      ">Save Changes<",
      ">Approve User<",
      ">Cancel Action<",
    ];
    const all = files.map((f) => f.body).join("\n");
    for (const t of titleCase) expect(all).not.toContain(t);
  });
});
