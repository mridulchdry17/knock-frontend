import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";

vi.mock("sonner", () => ({
  toast: vi.fn(),
  Toaster: () => null,
}));

import { toast } from "sonner";

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("dark")}>go-dark</button>
    </div>
  );
}

function setMatchMedia(matchesDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches: q.includes("dark") ? matchesDark : false,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("theme-ready");
    window.localStorage.clear();
  });

  it("defaults to light even when OS prefers dark", async () => {
    setMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("fires the OS-dark nudge toast on first session when OS is dark", async () => {
    setMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(toast).toHaveBeenCalledTimes(1);
    const [msg, opts] = (toast as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(msg).toBe("Knock is paper-first by design.");
    expect((opts as { action: { label: string } }).action.label).toBe("Switch to dark");
  });

  it("does NOT fire nudge when OS is light", () => {
    setMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it("does NOT fire nudge when localStorage already records a choice", () => {
    setMatchMedia(true);
    window.localStorage.setItem("knock.theme", "light");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it("does NOT fire nudge when previously dismissed", () => {
    setMatchMedia(true);
    window.localStorage.setItem("knock.osDarkNudgeDismissed", "true");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it("setTheme persists to localStorage and updates data-theme", async () => {
    setMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await act(async () => {
      screen.getByText("go-dark").click();
    });
    expect(window.localStorage.getItem("knock.theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
  });
});
