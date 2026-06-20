import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/templates/client", () => ({
  fetchTemplates: vi.fn(),
}));

import { fetchTemplates } from "@/lib/templates/client";
import { BatchTemplatePicker } from "@/components/knock/batch-template-picker";

const fetchMock = fetchTemplates as unknown as ReturnType<typeof vi.fn>;

function tpl(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "t1",
    name: "Recruiter intro",
    subject: "S",
    body: "<p>B</p>",
    is_starter: true,
  is_default: false,
    used_count: 0,
    reply_rate: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

describe("<BatchTemplatePicker />", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("self-hides when the user has zero templates", async () => {
    fetchMock.mockResolvedValueOnce({ kind: "list", data: { items: [] } });
    const onApply = vi.fn();
    const { container } = render(<BatchTemplatePicker onApply={onApply} />);
    // Wait for the templates fetch to resolve.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // No visible select.
    expect(container.querySelector("select")).toBeNull();
  });

  it("renders the picker once templates load", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl(), tpl({ id: "t2", name: "Alumni" })] },
    });
    render(<BatchTemplatePicker onApply={vi.fn()} />);
    expect(
      await screen.findByLabelText("Apply template to every card"),
    ).toBeInTheDocument();
    expect(screen.getByText("Recruiter intro")).toBeInTheDocument();
    expect(screen.getByText("Alumni")).toBeInTheDocument();
    // Microcopy that signals edits are preserved.
    expect(
      screen.getByText(/Cards you've edited will be left alone/),
    ).toBeInTheDocument();
  });

  it("calls onApply with the selected template id", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl(), tpl({ id: "t2", name: "Alumni" })] },
    });
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(<BatchTemplatePicker onApply={onApply} />);
    const select = (await screen.findByLabelText(
      "Apply template to every card",
    )) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "t2" } });
    await waitFor(() => expect(onApply).toHaveBeenCalledWith("t2"));
  });

  it("shows snag voice if onApply throws", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl()] },
    });
    const onApply = vi.fn().mockRejectedValue(new Error("boom"));
    render(<BatchTemplatePicker onApply={onApply} />);
    const select = (await screen.findByLabelText(
      "Apply template to every card",
    )) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "t1" } });
    expect(
      await screen.findByText("Couldn't apply that template. Try again."),
    ).toBeInTheDocument();
  });

  it("ignores selection of the empty placeholder option", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl()] },
    });
    const onApply = vi.fn();
    render(<BatchTemplatePicker onApply={onApply} />);
    const select = (await screen.findByLabelText(
      "Apply template to every card",
    )) as HTMLSelectElement;
    // The placeholder value is "" — pretend the parent re-mounted it.
    fireEvent.change(select, { target: { value: "" } });
    expect(onApply).not.toHaveBeenCalled();
  });
});
