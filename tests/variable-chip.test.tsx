import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  VariableChip,
  applySampleValues,
  htmlToPreviewText,
  renderWithVariables,
} from "@/components/knock/variable-chip";

describe("VariableChip", () => {
  it("renders the bracketed name with mono + ember-tint styling", () => {
    const { getByText, container } = render(<VariableChip name="first_name" />);
    expect(getByText("{{first_name}}")).toBeInTheDocument();
    const chip = container.querySelector("[data-variable]");
    expect(chip?.getAttribute("data-variable")).toBe("first_name");
    expect(chip?.className).toMatch(/font-mono/);
    expect(chip?.className).toMatch(/bg-ember-tint/);
  });
});

describe("renderWithVariables", () => {
  it("splits text into strings and chip nodes", () => {
    const out = renderWithVariables("Hi {{first_name}} at {{company}}!");
    // 5 nodes: "Hi ", chip, " at ", chip, "!"
    expect(out.length).toBe(5);
  });

  it("returns just text when no variables", () => {
    expect(renderWithVariables("plain string")).toEqual(["plain string"]);
  });

  it("ignores malformed variable forms", () => {
    expect(renderWithVariables("{{ }}")).toEqual(["{{ }}"]);
  });
});

describe("htmlToPreviewText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(htmlToPreviewText("<p>Hi <b>there</b></p><p>second</p>")).toBe(
      "Hi there second",
    );
  });

  it("decodes common entities", () => {
    expect(htmlToPreviewText("<p>R&amp;D &lt;okay&gt;</p>")).toBe("R&D <okay>");
  });
});

describe("applySampleValues", () => {
  it("substitutes known names, leaves unknown intact", () => {
    expect(
      applySampleValues("Hi {{first_name}} at {{company}}, role {{role}}", {
        first_name: "Sarah",
        company: "Acme",
        role: "Recruiter",
      }),
    ).toBe("Hi Sarah at Acme, role Recruiter");
    expect(
      applySampleValues("Hi {{unknown}}", { first_name: "Sarah" }),
    ).toBe("Hi {{unknown}}");
  });
});
