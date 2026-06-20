import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/lib/templates/client", () => ({
  fetchTemplates: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  testSendTemplate: vi.fn(),
}));

import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  testSendTemplate,
} from "@/lib/templates/client";
import { useTemplates } from "@/lib/templates/use-templates";
import { ApiError } from "@/lib/api/errors";

const fetchMock = fetchTemplates as unknown as ReturnType<typeof vi.fn>;
const createMock = createTemplate as unknown as ReturnType<typeof vi.fn>;
const updateMock = updateTemplate as unknown as ReturnType<typeof vi.fn>;
const deleteMock = deleteTemplate as unknown as ReturnType<typeof vi.fn>;
const testSendMock = testSendTemplate as unknown as ReturnType<typeof vi.fn>;

function tpl(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "t1",
    name: "Recruiter intro",
    subject: "Subj",
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

describe("useTemplates", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    testSendMock.mockReset();
  });

  it("transitions loading → populated and exposes count/cap", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl(), tpl({ id: "t2" })], count: 2, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("populated"));
    expect(result.current.count).toBe(2);
    expect(result.current.cap).toBe(3);
    expect(result.current.atCap).toBe(false);
  });

  it("unavailable result becomes empty status with cap=3", async () => {
    fetchMock.mockResolvedValueOnce({ kind: "unavailable" });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.cap).toBe(3);
    expect(result.current.items).toEqual([]);
  });

  it("error kind sets status=error", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "error",
      error: new ApiError(500, "boom", "Boom."),
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.code).toBe("boom");
  });

  it("atCap becomes true when count === cap", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl(), tpl({ id: "t2" }), tpl({ id: "t3" })], count: 3, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.atCap).toBe(true));
  });

  it("create optimistically appends + resolves with server canonical", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl()], count: 1, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    let resolveCreate!: (v: unknown) => void;
    createMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveCreate = res;
        }),
    );

    act(() => {
      void result.current.mutations.create({
        name: "New",
        subject: "S",
        body: "B",
      });
    });
    // Optimistic insert visible immediately.
    await waitFor(() => expect(result.current.items.length).toBe(2));
    expect(result.current.count).toBe(2);

    act(() => {
      resolveCreate(tpl({ id: "t-new", name: "New" }));
    });
    await waitFor(() =>
      expect(result.current.items.some((t) => t.id === "t-new")).toBe(true),
    );
  });

  it("create rolls back on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl()], count: 1, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    createMock.mockRejectedValueOnce(
      new ApiError(422, "validation_failed", "bad"),
    );
    await expect(
      result.current.mutations.create({ name: "X", subject: "S", body: "B" }),
    ).rejects.toBeDefined();

    await waitFor(() => expect(result.current.items.length).toBe(1));
  });

  it("update applies optimistically and replaces with server result", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl({ id: "t1", subject: "Old" })], count: 1, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    updateMock.mockResolvedValueOnce(
      tpl({ id: "t1", subject: "Server-blessed" }),
    );

    await act(async () => {
      await result.current.mutations.update("t1", { subject: "New" });
    });
    expect(result.current.items[0].subject).toBe("Server-blessed");
  });

  it("update rolls back on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl({ id: "t1", subject: "Old" })], count: 1, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    updateMock.mockRejectedValueOnce(new ApiError(500, "boom", "Boom."));
    await expect(
      result.current.mutations.update("t1", { subject: "New" }),
    ).rejects.toBeDefined();
    expect(result.current.items[0].subject).toBe("Old");
  });

  it("remove optimistically drops + rolls back on failure", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl({ id: "t1" }), tpl({ id: "t2" })], count: 2, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    deleteMock.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.mutations.remove("t1");
    });
    expect(result.current.items.length).toBe(1);
    expect(result.current.count).toBe(1);

    deleteMock.mockRejectedValueOnce(new ApiError(500, "boom", "Boom."));
    await expect(result.current.mutations.remove("t2")).rejects.toBeDefined();
    expect(result.current.items.length).toBe(1);
  });

  it("testSend forwards id to client", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "list",
      data: { items: [tpl()], count: 1, cap: 3 },
    });
    const { result } = renderHook(() => useTemplates());
    await waitFor(() => expect(result.current.status).toBe("populated"));

    testSendMock.mockResolvedValueOnce({ sent: true });
    await act(async () => {
      await result.current.mutations.testSend("t1");
    });
    expect(testSendMock).toHaveBeenCalledWith("t1");
  });
});
