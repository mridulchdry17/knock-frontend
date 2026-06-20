import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/preferences/client", () => ({
  fetchPreferences: vi.fn(),
  fetchExcludedDomains: vi.fn(),
  updatePreferences: vi.fn(),
  addExcludedDomain: vi.fn(),
  removeExcludedDomain: vi.fn(),
  enableAutopilot: vi.fn(),
  disableAutopilot: vi.fn(),
}));

// AutopilotSection lazily fetches templates + today's batch when the
// preview sheet opens so the user can see the rendered emails before
// committing. The fetches just resolve to empty results in tests — the
// dialog still opens and renders the title/buttons, which is all these
// tests care about.
vi.mock("@/lib/templates/client", () => ({
  fetchTemplates: vi.fn().mockResolvedValue({
    kind: "list",
    data: { items: [], count: 0, cap: 3 },
  }),
}));
vi.mock("@/lib/today/client", () => ({
  fetchTodayBatch: vi.fn().mockResolvedValue({ kind: "no-batch-yet" }),
}));

const hoisted = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  signOutRemoteMock: vi.fn(),
  setThemeMock: vi.fn(),
  toastMock: vi.fn(),
  tierRef: { current: "paid" as "free" | "paid" },
}));
const { refreshMock, signOutRemoteMock, setThemeMock, toastMock, tierRef } = hoisted;

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "user@example.com",
      name: "Sam",
      tier: hoisted.tierRef.current,
      onboarded: true,
      gmail_connected: true,
      autopilot_enabled: false,
      autopilot_paused_at: null,
    },
    refresh: hoisted.refreshMock,
    signOutRemote: hoisted.signOutRemoteMock,
  }),
}));

vi.mock("@/components/theme/theme-provider", () => ({
  useTheme: () => ({
    theme: "light",
    resolvedTheme: "light",
    setTheme: hoisted.setThemeMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(hoisted.toastMock, { dismiss: vi.fn() }),
}));

vi.mock("@/lib/auth/gmail", () => ({
  disconnectGmail: vi.fn().mockResolvedValue(undefined),
  startGmailOAuth: vi.fn(),
}));

import {
  fetchPreferences,
  fetchExcludedDomains,
  updatePreferences,
  addExcludedDomain,
  enableAutopilot,
  disableAutopilot,
} from "@/lib/preferences/client";
import { PreferencesView } from "@/components/preferences/preferences-view";
import { ApiError } from "@/lib/api/errors";

const fetchPrefsMock = fetchPreferences as unknown as ReturnType<typeof vi.fn>;
const fetchDomainsMock = fetchExcludedDomains as unknown as ReturnType<typeof vi.fn>;
const updateMock = updatePreferences as unknown as ReturnType<typeof vi.fn>;
const addMock = addExcludedDomain as unknown as ReturnType<typeof vi.fn>;
const enableMock = enableAutopilot as unknown as ReturnType<typeof vi.fn>;
const disableMock = disableAutopilot as unknown as ReturnType<typeof vi.fn>;

const livePrefs = {
  target_role: "Recruiter",
  target_industries: ["Tech"],
  target_location: "SF",
  notify_gmail_disconnect: true,
  notify_daily_summary: true,
  autopilot_enabled: false,
  autopilot_paused_at: null,
  autopilot_auto_pause_on_reply: true,
};

beforeEach(() => {
  tierRef.current = "paid";
  refreshMock.mockReset().mockResolvedValue(undefined);
  signOutRemoteMock.mockReset().mockResolvedValue(undefined);
  setThemeMock.mockReset();
  toastMock.mockReset();
  fetchPrefsMock.mockReset();
  fetchDomainsMock.mockReset();
  updateMock.mockReset();
  addMock.mockReset();
  enableMock.mockReset();
  disableMock.mockReset();
});

function primeDefaults(prefs = livePrefs, items: { domain: string; created_at: string }[] = []) {
  fetchPrefsMock.mockResolvedValueOnce({ kind: "loaded", data: prefs });
  fetchDomainsMock.mockResolvedValueOnce({ kind: "loaded", data: { items } });
}

describe("PreferencesView — sections", () => {
  it("renders header microcopy", async () => {
    primeDefaults();
    render(<PreferencesView />);
    expect(
      await screen.findByText(
        /Settings for who Knock reaches out to and how we'll keep in touch\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Preferences" })).toBeInTheDocument();
  });

  it("renders all five sections for paid users", async () => {
    primeDefaults();
    render(<PreferencesView />);
    expect(await screen.findByText("Who you're hunting")).toBeInTheDocument();
    expect(screen.getByText("Domains to skip")).toBeInTheDocument();
    expect(screen.getByText("How we'll keep in touch")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Autopilot" })).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("hides the Autopilot section for free-tier users", async () => {
    tierRef.current ="free";
    primeDefaults();
    render(<PreferencesView />);
    await screen.findByText("Who you're hunting");
    expect(screen.queryByRole("heading", { level: 2, name: "Autopilot" })).toBeNull();
  });

  it("shows empty state when there are no excluded domains", async () => {
    primeDefaults(livePrefs, []);
    render(<PreferencesView />);
    expect(await screen.findByText("No exclusions yet.")).toBeInTheDocument();
  });

  it("triggers autosave on role blur via flush", async () => {
    primeDefaults();
    updateMock.mockResolvedValue({ ...livePrefs, target_role: "Engineering Manager" });
    render(<PreferencesView />);
    const input = (await screen.findByLabelText("Role")) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Engineering Manager" } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ target_role: "Engineering Manager" }),
    );
  });
});

describe("PreferencesView — excluded domains", () => {
  it("validates malformed domain inline (no API call)", async () => {
    primeDefaults();
    render(<PreferencesView />);
    const user = userEvent.setup();
    const input = await screen.findByLabelText("Domain to exclude");
    await user.type(input, "not-a-domain");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(
      await screen.findByText("That doesn't look like a valid domain."),
    ).toBeInTheDocument();
    expect(addMock).not.toHaveBeenCalled();
  });

  it("surfaces 409 already_excluded inline", async () => {
    primeDefaults();
    addMock.mockRejectedValueOnce(
      new ApiError(409, "already_excluded", "Already on your list."),
    );
    render(<PreferencesView />);
    const user = userEvent.setup();
    const input = await screen.findByLabelText("Domain to exclude");
    await user.type(input, "spam.com");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("That's already on your list.")).toBeInTheDocument();
  });

  it("appends domain to the chip list on success", async () => {
    primeDefaults();
    addMock.mockResolvedValueOnce({ domain: "skip.io", created_at: "2026-05-01T00:00:00Z" });
    render(<PreferencesView />);
    const user = userEvent.setup();
    const input = await screen.findByLabelText("Domain to exclude");
    await user.type(input, "skip.io");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("skip.io")).toBeInTheDocument();
  });
});

describe("PreferencesView — autopilot", () => {
  it("opens confirm dialog when switching from manual to autopilot", async () => {
    primeDefaults();
    render(<PreferencesView />);
    const user = userEvent.setup();
    const autopilotRadio = await screen.findByRole("radio", { name: /Autopilot/ });
    await user.click(autopilotRadio);
    // Title pins the trust-first preview sheet; description copy changed in
    // the autopilot-template-default refactor (now mentions a template name
    // + a 6am send time once the templates fetch resolves).
    expect(await screen.findByText("Turn on autopilot?")).toBeInTheDocument();
  });

  it("enables autopilot on confirm and shows locked toast", async () => {
    primeDefaults();
    enableMock.mockResolvedValueOnce({ autopilot_enabled: true });
    render(<PreferencesView />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: /Autopilot/ }));
    // Button label changed from "Enable autopilot" to "Turn on autopilot"
    // in the trust-first preview sheet.
    await user.click(await screen.findByRole("button", { name: "Turn on autopilot" }));
    await waitFor(() => expect(enableMock).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(
      "Autopilot's on. First batch goes out tomorrow at 6am.",
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("disables autopilot instantly without confirm", async () => {
    primeDefaults({ ...livePrefs, autopilot_enabled: true });
    disableMock.mockResolvedValueOnce({ autopilot_enabled: false });
    render(<PreferencesView />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: /Manual review/ }));
    await waitFor(() => expect(disableMock).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith("Switched to manual review.");
  });
});

describe("PreferencesView — account section", () => {
  it("theme segmented control calls setTheme", async () => {
    primeDefaults();
    render(<PreferencesView />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("radio", { name: "Dark" }));
    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("sign out triggers signOutRemote and toast", async () => {
    primeDefaults();
    render(<PreferencesView />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(toastMock).toHaveBeenCalledWith("Signed out. Come back soon.");
    await waitFor(() => expect(signOutRemoteMock).toHaveBeenCalled());
  });
});
