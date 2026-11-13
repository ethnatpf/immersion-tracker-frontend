import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redirectToSignIn } = vi.hoisted(() => ({
  redirectToSignIn: vi.fn(),
}));
vi.mock("@/lib/auth-redirect", () => ({ redirectToSignIn }));

import { ApiError, apiFetch } from "@/lib/api/fetch";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch authentication recovery", () => {
  it("redirects to sign-in for a session that could not be renewed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { code: "session_expired", message: "Please sign in again." },
          { status: 401 },
        ),
      ),
    );

    await expect(apiFetch("/api/backend/language")).rejects.toBeInstanceOf(ApiError);

    expect(redirectToSignIn).toHaveBeenCalledOnce();
  });

  it("does not redirect when the backend rejects an otherwise active session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { code: "api_unauthorized", message: "Not allowed." },
          { status: 401 },
        ),
      ),
    );

    await expect(apiFetch("/api/backend/language")).rejects.toBeInstanceOf(ApiError);

    expect(redirectToSignIn).not.toHaveBeenCalled();
  });
});
