import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateCard, __TEST__ } from "@/components/knock/template-card";
import type { Template } from "@/lib/templates/types";

const baseTemplate: Template = {
  id: "t1",
  name: "Recruiter intro",
  subject: "Hello {{first_name}}",
  body: "<p>Hi {{first_name}} at {{company}}, here's why…</p>",
  is_starter: true,
  is_default: false,
  used_count: 4,
  reply_rate: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

describe("TemplateCard", () => {
  it("renders name + 'Used N times' (no reply rate when null)", () => {
    render(
      <TemplateCard template={baseTemplate} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText("Recruiter intro")).toBeInTheDocument();
    expect(screen.getByText("Used 4 times")).toBeInTheDocument();
  });

  it("appends reply-rate metric when reply_rate !== null", () => {
    render(
      <TemplateCard
        template={{ ...baseTemplate, used_count: 12, reply_rate: 0.25 }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/Used 12 times.*25% reply rate/)).toBeInTheDocument();
  });

  it("singularizes Used 1 time", () => {
    expect(__TEST__.formatMetric(1, null)).toBe("Used 1 time");
    expect(__TEST__.formatMetric(0, null)).toBe("Used 0 times");
  });

  it("renders variable chips inside the body preview", () => {
    const { container } = render(
      <TemplateCard template={baseTemplate} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const chips = container.querySelectorAll("[data-variable]");
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });

  it("clicking the card body fires onEdit", () => {
    const onEdit = vi.fn();
    render(
      <TemplateCard template={baseTemplate} onEdit={onEdit} onDelete={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Recruiter intro"));
    expect(onEdit).toHaveBeenCalledWith("t1");
  });

  it("Edit button fires onEdit; Delete button fires onDelete; neither bubbles to card", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TemplateCard template={baseTemplate} onEdit={onEdit} onDelete={onDelete} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onEdit).toHaveBeenCalledWith("t1");
    expect(onDelete).toHaveBeenCalledWith("t1");
    // Edit was called once via button click; the card click handler skips
    // when target is inside [data-card-action].
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
