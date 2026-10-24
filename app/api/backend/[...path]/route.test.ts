import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }));
vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken } }));
import { GET } from "./route";

const upstream = vi.fn();
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", upstream);
  vi.stubEnv("API_URL", "http://backend.test:4000");
  getAccessToken.mockResolvedValue({ token: "server-access-token" });
  upstream.mockResolvedValue(Response.json({ result: "private data" }));
});

describe("authenticated API proxy", () => {
  it.each(["language", "user/preferences", "dashboard/statistics", "immersion-session"])("adds the SDK access token when fetching %s", async (path) => {
    const response = await GET(new Request(`http://frontend.test/api/backend/${path}?language=ja&range=week`, {
      headers: { Authorization: "Bearer untrusted-browser-token" },
    }), context(path));
    const [url, options] = upstream.mock.calls[0];
    expect(url.toString()).toBe(`http://backend.test:4000/${path}?language=ja&range=week`);
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer server-access-token");
    expect(options.cache).toBe("no-store");
    expect(options.redirect).toBe("error");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ result: "private data" });
    expect(response.headers.get("Authorization")).toBeNull();
  });

  it("rejects expired or missing sessions before contacting the API", async () => {
    getAccessToken.mockRejectedValue(new Error("missing session with sensitive details"));
    const response = await GET(new Request("http://frontend.test/api/backend/language"), context("language"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "session_expired", message: "Please sign in again." });
    expect(upstream).not.toHaveBeenCalled();
  });

  it("distinguishes a backend rejection from an expired frontend session", async () => {
    upstream.mockResolvedValue(Response.json({ message: "Unauthorized" }, { status: 401 }));
    const response = await GET(new Request("http://frontend.test/api/backend/language"), context("language"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "api_unauthorized", message: "The API could not authorize this request." });
  });

  it("does not proxy paths outside the authorized endpoints", async () => {
    const response = await GET(new Request("http://frontend.test/api/backend/metrics"), context("metrics"));
    expect(response.status).toBe(404);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("reports an unavailable backend without exposing internal details", async () => {
    upstream.mockRejectedValue(new Error("sensitive connection details"));
    const response = await GET(new Request("http://frontend.test/api/backend/language"), context("language"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sensitive");
  });

  it.each([401, 500, 503])("preserves the request ID and status for an upstream %i", async (status) => {
    upstream.mockResolvedValue(Response.json({ message: "Upstream error" }, { status, headers: { "X-Request-ID": `backend-${status}` } }));
    const response = await GET(new Request("http://frontend.test/api/backend/language"), context("language"));
    expect(response.status).toBe(status);
    expect(response.headers.get("X-Request-ID")).toBe(`backend-${status}`);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    if (status !== 401) expect(await response.json()).toEqual({ message: "Upstream error" });
  });
});
