import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  GlobalShortcutsProvider,
  useGlobalShortcuts,
} from "@/components/knock/global-shortcuts";

function setPointer(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(pointer: fine)" ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function Trigger() {
  const { openShortcuts } = useGlobalShortcuts();
  return (
    <button type="button" onClick={openShortcuts}>
      open
    </button>
  );
}

describe("<GlobalShortcutsProvider />", () => {
  beforeEach(() => {
    setPointer(true);
  });

  it("opens via the imperative openShortcuts() from any descendant", () => {
    render(
      <GlobalShortcutsProvider>
        <Trigger />
      </GlobalShortcutsProvider>,
    );
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });

  it("opens on global '?' keypress when pointer is fine", () => {
    render(
      <GlobalShortcutsProvider>
        <div>body</div>
      </GlobalShortcutsProvider>,
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    });
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });

  it("ignores '?' on coarse pointer (mobile)", () => {
    setPointer(false);
    render(
      <GlobalShortcutsProvider>
        <div>body</div>
      </GlobalShortcutsProvider>,
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    });
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
  });

  it("ignores '?' when typing in an input", () => {
    render(
      <GlobalShortcutsProvider>
        <input data-testid="ti" />
      </GlobalShortcutsProvider>,
    );
    const input = screen.getByTestId("ti");
    input.focus();
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "?", bubbles: true }),
      );
    });
    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
  });

  it("renders all three categories with the expected labels", () => {
    render(
      <GlobalShortcutsProvider>
        <Trigger />
      </GlobalShortcutsProvider>,
    );
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(
      screen.getByText("Tap anywhere outside or press Esc to close."),
    ).toBeInTheDocument();
  });
});
