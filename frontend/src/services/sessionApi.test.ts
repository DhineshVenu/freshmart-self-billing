import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cancelSession } from "./sessionApi";

describe("sessionApi.cancelSession (worker Cancel Session action)", () => {
  const ORIGINAL_TOKEN = sessionStorage.getItem("auth_token");

  beforeEach(() => {
    sessionStorage.setItem("auth_token", "test-worker-jwt");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === null) sessionStorage.removeItem("auth_token");
    else sessionStorage.setItem("auth_token", ORIGINAL_TOKEN);
  });

  it("sends DELETE /api/sessions/:code with the correct auth header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await cancelSession("abc-123");

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:5000/api/sessions/abc-123");
    expect((init as RequestInit).method).toBe("DELETE");
    expect((init as RequestInit).credentials).toBe("include");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-worker-jwt");
  });

  it("throws when the backend rejects the cancel request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelSession("missing-code")).rejects.toThrow("Session not found");
  });
});
