import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";

let mockPath = "/today";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPath,
}));

import { RouteProgress } from "@/components/knock/route-progress";

describe("<RouteProgress />", () => {
  it("renders idle on first mount (no animation kicks in until pathname changes)", () => {
    mockPath = "/today";
    const { container, getByTestId } = render(<RouteProgress />);
    const el = getByTestId("route-progress");
    expect(el.getAttribute("data-phase")).toBe("idle");
    expect(container.querySelector(".bg-flint")).toBeTruthy();
  });

  it("transitions through running → complete when the pathname changes", () => {
    vi.useFakeTimers();
    mockPath = "/today";
    const { rerender, getByTestId } = render(<RouteProgress />);
    expect(getByTestId("route-progress").getAttribute("data-phase")).toBe("idle");

    mockPath = "/inbox";
    act(() => {
      rerender(<RouteProgress />);
    });
    expect(getByTestId("route-progress").getAttribute("data-phase")).toBe("running");

    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(getByTestId("route-progress").getAttribute("data-phase")).toBe("complete");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(getByTestId("route-progress").getAttribute("data-phase")).toBe("idle");
    vi.useRealTimers();
  });
});
