import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustGrid } from "@/components/knock/trust-grid";

describe("<TrustGrid />", () => {
  it("renders both columns + the 24h token-deletion footer", () => {
    render(<TrustGrid />);
    expect(screen.getByText("What we ask Google for")).toBeInTheDocument();
    expect(screen.getByText("What we never do")).toBeInTheDocument();
    expect(
      screen.getByText(/delete your tokens within 24 hours/i),
    ).toBeInTheDocument();
    // First "ask" item — locked microcopy.
    expect(
      screen.getByText(/Send email on your behalf/),
    ).toBeInTheDocument();
    // First "never" item — locked microcopy.
    expect(
      screen.getByText(/Read emails from anyone you didn’t write to first/),
    ).toBeInTheDocument();
  });
});
