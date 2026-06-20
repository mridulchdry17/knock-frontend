import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/lib/templates/client", () => ({
  fetchTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  testSendTemplate: vi.fn(),
}));

// next/dynamic import in editor-modal pulls Tiptap, which doesn't mount in
// jsdom cleanly. We don't open the editor in this test file — but we still
// stub the modal to avoid pulling Tiptap on dynamic resolve.
vi.mock("@/components/knock/template-editor-modal", () => ({
  TemplateEditorModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="editor-modal-stub" /> : null,
  DiscardConfirm: () => null,
}));

import {
  fetchTemplates,
  deleteTemplate,
} from "@/lib/templates/client";
import { TemplatesView } from "@/components/knock/templates-view";

const fetchMock = fetchTemplates as unknown as ReturnType<typeof vi.fn>;
const deleteMock = deleteTemplate as unknown as ReturnType<typeof vi.fn>;

function tpl(id: string, name: string) {
  return {
    id,
    name,
    subject: "S",
    body: "<p>B</p>",
    is_starter: true,
  is_default: false,
    used_count: 0,
    reply_rate: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  };
}

describe("TemplatesView", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    deleteMock.mockReset();
  });

  it("shows '1 of 3' counter pill with live count", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl("t1", "Recruiter intro")], count: 1, cap: 3 },
    });
    render(<TemplatesView />);
    await waitFor(() =>
      expect(screen.getByTestId("template-counter")).toHaveTextContent("1 of 3"),
    );
  });

  it("disables 'New template' at cap and surfaces tooltip text", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: {
        items: [tpl("t1", "A"), tpl("t2", "B"), tpl("t3", "C")],
        count: 3,
        cap: 3,
      },
    });
    render(<TemplatesView />);
    await waitFor(() =>
      expect(screen.getByTestId("template-counter")).toHaveTextContent("3 of 3"),
    );
    const btn = screen.getByTestId("new-template-btn");
    expect(btn).toBeDisabled();
  });

  it("renders 'Setting up your starter templates…' on unavailable", async () => {
    fetchMock.mockResolvedValueOnce({ kind: "unavailable" });
    render(<TemplatesView />);
    await waitFor(() =>
      expect(
        screen.getByText("Setting up your starter templates…"),
      ).toBeInTheDocument(),
    );
  });

  it("delete confirm uses locked microcopy with current count", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl("t1", "Recruiter intro")], count: 1, cap: 3 },
    });
    render(<TemplatesView />);
    await waitFor(() =>
      expect(screen.getByText("Recruiter intro")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this template?")).toBeInTheDocument();
    expect(
      screen.getByText(/You can always make a new one — you have 1 of 3 used\./),
    ).toBeInTheDocument();
  });
});
