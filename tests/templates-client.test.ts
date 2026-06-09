import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api/client";
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  testSendTemplate,
  updateTemplate,
} from "@/lib/templates/client";
import { __resetTemplateFixturesForTests } from "@/lib/templates/fixtures";

const apiFetchMock = apiFetch as unknown as ReturnType<typeof vi.fn>;
const ORIGINAL_ENV = { ...process.env };

function setFixtureMode(on: boolean) {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_USE_TODAY_FIXTURES: on ? "true" : "false",
  };
}

describe("templates client (live mode)", () => {
  beforeEach(() => {
    setFixtureMode(false);
    apiFetchMock.mockReset();
  });

  it("fetchTemplates parses list response with Zod", async () => {
    apiFetchMock.mockResolvedValueOnce({
      items: [
        {
          id: "t1",
          name: "Recruiter intro",
          subject: "S",
          body: "<p>B</p>",
          is_starter: true,
          used_count: 4,
          reply_rate: null,
          created_at: "2026-05-01T00:00:00Z",
          updated_at: "2026-05-01T00:00:00Z",
        },
      ],
      count: 1,
      cap: 3,
    });
    const res = await fetchTemplates();
    expect(res.kind).toBe("list");
    if (res.kind === "list") {
      expect(res.data.items[0].name).toBe("Recruiter intro");
      expect(res.data.cap).toBe(3);
    }
  });

  it("fetchTemplates maps 502 to unavailable", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(502, "upstream_unavailable", "We hit a snag."),
    );
    const res = await fetchTemplates();
    expect(res.kind).toBe("unavailable");
  });

  it("fetchTemplates maps other ApiError to error", async () => {
    apiFetchMock.mockRejectedValueOnce(
      new ApiError(500, "server_error", "Boom."),
    );
    const res = await fetchTemplates();
    expect(res.kind).toBe("error");
  });

  it("createTemplate posts body and parses response", async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: "t2",
      name: "X",
      subject: "S",
      body: "B",
      is_starter: false,
      used_count: 0,
      reply_rate: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    });
    const res = await createTemplate({ name: "X", subject: "S", body: "B" });
    expect(res.id).toBe("t2");
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/templates", {
      method: "POST",
      body: { name: "X", subject: "S", body: "B" },
    });
  });

  it("updateTemplate PATCHes the right path", async () => {
    apiFetchMock.mockResolvedValueOnce({
      id: "t1",
      name: "X",
      subject: "S",
      body: "B",
      is_starter: false,
      used_count: 0,
      reply_rate: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    });
    await updateTemplate("t1", { subject: "New" });
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/templates/t1", {
      method: "PATCH",
      body: { subject: "New" },
    });
  });

  it("deleteTemplate DELETEs the right path", async () => {
    apiFetchMock.mockResolvedValueOnce(undefined);
    await deleteTemplate("t1");
    expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/templates/t1", {
      method: "DELETE",
    });
  });

  it("testSendTemplate POSTs and parses response", async () => {
    apiFetchMock.mockResolvedValueOnce({ sent: true });
    const res = await testSendTemplate("t1");
    expect(res.sent).toBe(true);
  });
});

describe("templates client (fixture mode)", () => {
  beforeEach(() => {
    setFixtureMode(true);
    apiFetchMock.mockReset();
    __resetTemplateFixturesForTests();
  });

  it("returns 3 deterministic starters", async () => {
    const res = await fetchTemplates();
    expect(res.kind).toBe("list");
    if (res.kind === "list") {
      expect(res.data.items.map((t) => t.name)).toEqual([
        "Recruiter intro",
        "Warm referral ask",
        "Post-application nudge",
      ]);
      expect(res.data.cap).toBe(3);
    }
  });

  it("create at cap throws template_limit_reached", async () => {
    await expect(
      createTemplate({ name: "X", subject: "S", body: "B" }),
    ).rejects.toMatchObject({ code: "template_limit_reached" });
  });

  it("delete then create allows adding back to cap", async () => {
    const list = await fetchTemplates();
    if (list.kind !== "list") throw new Error("expected list");
    const first = list.data.items[0];
    await deleteTemplate(first.id);
    const created = await createTemplate({
      name: "New one",
      subject: "S",
      body: "B",
    });
    expect(created.name).toBe("New one");
  });

  it("test-send returns sent:true", async () => {
    const list = await fetchTemplates();
    if (list.kind !== "list") throw new Error("expected list");
    const r = await testSendTemplate(list.data.items[0].id);
    expect(r.sent).toBe(true);
  });
});
