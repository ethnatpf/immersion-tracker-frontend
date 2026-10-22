import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { middleware } = vi.hoisted(() => ({ middleware: vi.fn() }));
vi.mock("@/lib/auth0", () => ({ auth0: { middleware } }));

import { proxy } from "./proxy";

describe("authentication proxy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards the requested path and query, overriding a spoofed return destination", async () => {
    const authResponse = NextResponse.next();
    authResponse.cookies.set("__session", "renewed", { httpOnly: true });
    authResponse.headers.set("cache-control", "private, no-store");
    middleware.mockResolvedValue(authResponse);

    const response = await proxy(new Request("https://tracker.example/sessions?language=ja", {
      headers: { "x-auth-return-to": "https://attacker.example" },
    }));

    expect(response.headers.get("x-middleware-request-x-auth-return-to")).toBe(
      "/sessions?language=ja",
    );
    expect(response.cookies.get("__session")?.value).toBe("renewed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.has("x-auth-return-to")).toBe(false);
  });

  it("preserves Auth0 redirects without forwarding page headers", async () => {
    const authResponse = NextResponse.redirect("https://tenant.auth0.com/authorize");
    authResponse.cookies.set("transaction", "state");
    middleware.mockResolvedValue(authResponse);

    const response = await proxy(new Request("https://tracker.example/auth/login"));

    expect(response).toBe(authResponse);
    expect(response.headers.get("location")).toBe("https://tenant.auth0.com/authorize");
    expect(response.cookies.get("transaction")?.value).toBe("state");
    expect(response.headers.has("x-middleware-override-headers")).toBe(false);
  });
});
