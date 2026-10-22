import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, headers, redirect } = vi.hoisted(() => ({
  getSession: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth0", () => ({ auth0: { getSession } }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers }));

import { requireSession } from "./require-session";

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headers.mockResolvedValue(new Headers());
  });

  it("returns to the requested page with its query parameters after login", async () => {
    getSession.mockResolvedValue(null);
    const returnTo = "/sessions/123?language=ja&filter=audio%20books";
    headers.mockResolvedValue(new Headers({ "x-auth-return-to": returnTo }));

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      `/auth/login?${new URLSearchParams({ returnTo })}`,
    );
  });

  it.each(["https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)"])(
    "falls back to home for an unsafe return destination: %s",
    async (returnTo) => {
      getSession.mockResolvedValue(null);
      headers.mockResolvedValue(new Headers({ "x-auth-return-to": returnTo }));

      await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirect).toHaveBeenCalledWith("/auth/login?returnTo=%2F");
    },
  );

  it("redirects visitors without a session to Universal Login", async () => {
    getSession.mockResolvedValue(null);

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/login?returnTo=%2F");
  });

  it("allows authenticated visitors and returns their session", async () => {
    const session = { user: { sub: "auth0|learner", name: "Learner" } };
    getSession.mockResolvedValue(session);

    await expect(requireSession()).resolves.toBe(session);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("propagates session failures instead of allowing access", async () => {
    getSession.mockRejectedValue(new Error("Session unavailable"));

    await expect(requireSession()).rejects.toThrow("Session unavailable");
    expect(redirect).not.toHaveBeenCalled();
  });
});
