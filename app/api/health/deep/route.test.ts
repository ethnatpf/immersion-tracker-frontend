import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const upstream = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", upstream);
  vi.stubEnv("API_URL", "http://backend.test:4000/");
});

describe("deep health route", () => {
  it("reports frontend and backend status with dependency details", async () => {
    const details = {
      "api-http": { status: "up" },
      database: { responseTime: 6, status: "up" },
    };
    upstream.mockResolvedValue(Response.json({ status: "ok", details }));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "up",
      frontend: { status: "up" },
      backend: { status: "up", details },
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(upstream.mock.calls[0][0]).toBe("http://backend.test:4000/health");
    expect(upstream.mock.calls[0][1].cache).toBe("no-store");
  });

  it("returns 503 while preserving backend details when a dependency is down", async () => {
    const details = { database: { responseTime: 12, status: "down" } };
    upstream.mockResolvedValue(Response.json({ status: "ok", details }));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "down",
      frontend: { status: "up" },
      backend: { status: "down", details },
    });
  });

  it("reports unhealthy when the backend marks its root health as degraded", async () => {
    upstream.mockResolvedValue(
      Response.json({ status: "degraded", details: { database: { status: "up" } } }),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    expect((await response.json()).backend.status).toBe("down");
  });

  it("reports backend unavailable without exposing fetch errors", async () => {
    upstream.mockRejectedValue(new Error("private network detail"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "down",
      frontend: { status: "up" },
      backend: { status: "down", details: null },
    });
  });
});
