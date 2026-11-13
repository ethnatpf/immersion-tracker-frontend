import { afterEach, describe, expect, it, vi } from "vitest";
import { redirectToSignIn, signInUrl } from "@/lib/auth-redirect";

afterEach(() => vi.unstubAllGlobals());

describe("sign-in redirects", () => {
  it("preserves the current path and query string", () => {
    expect(
      signInUrl("https://app.test", "/library", "?sort=title&language=ja"),
    ).toBe(
      "https://app.test/auth/login?returnTo=%2Flibrary%3Fsort%3Dtitle%26language%3Dja",
    );
  });

  it("navigates to sign-in with the current path and query", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: {
        origin: "https://app.test",
        pathname: "/library",
        search: "?sort=title",
        assign,
      },
    });

    redirectToSignIn();

    expect(assign).toHaveBeenCalledWith(
      "https://app.test/auth/login?returnTo=%2Flibrary%3Fsort%3Dtitle",
    );
  });
});
