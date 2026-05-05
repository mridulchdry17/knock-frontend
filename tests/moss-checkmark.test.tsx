import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MossCheckmark } from "@/components/knock/moss-checkmark";

describe("<MossCheckmark />", () => {
  it("renders an svg with the draw-animated path", () => {
    const { container } = render(<MossCheckmark size={64} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("64");
    expect(svg?.getAttribute("height")).toBe("64");
    const path = container.querySelector(".moss-checkmark-path");
    expect(path).not.toBeNull();
  });

  it("exposes an aria-label for screen readers", () => {
    const { container } = render(<MossCheckmark aria-label="All set" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("All set");
  });
});
