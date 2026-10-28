import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Providers } from "@/app/providers";
import { apiFetch } from "@/lib/api/fetch";
import { server } from "@/test/server";
import { AppShell } from "@/components/app-shell";
import { QueryError } from "@/components/error/query-error";

const route = vi.hoisted(() => ({ pathname: "/library" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

beforeEach(() => {
  server.use(http.get("*/timer", () => HttpResponse.json({ message: "No active timer" }, { status: 404 })));
});

afterEach(() => {
  route.pathname = "/library";
  window.history.replaceState(null, "", "/");
});

function Library() {
  const query = useQuery({ queryKey: ["library"], queryFn: () => apiFetch<{ title: string }>("/api/backend/library"), retry: false });
  if (query.isError) return <QueryError title="Could not load library" error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isPending) return <p>Loading library…</p>;
  return <><h1>{query.data.title}</h1><button onClick={() => void query.refetch()}>Reload library</button></>;
}

function workspace(children = <Library />) {
  return <Providers><AppShell>{children}</AppShell></Providers>;
}

function renderForExpectedServerError(ui = workspace()) {
  return render(ui, { onCaughtError: () => {} });
}

describe("shared API error handling", () => {
  it("keeps navigation available when the timer lookup has a server error", async () => {
    server.use(http.get("*/timer", () => HttpResponse.json({}, { status: 503 })));
    renderForExpectedServerError(workspace(<h1>Your library</h1>));
    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeVisible();
  });
  it.each([500, 502, 503, 504, 599])("replaces stale page content on a background %i, keeps navigation, and handles another failed retry", async (status) => {
    const user = userEvent.setup();
    server.use(http.get("*/library", () => HttpResponse.json({ title: "Your library" })));
    const { rerender } = renderForExpectedServerError(workspace());
    await screen.findByRole("heading", { name: "Your library" });

    let attempt = 0;
    server.use(http.get("*/library", () => HttpResponse.json({}, { status, headers: { "X-Request-ID": `library-failure-${++attempt}` } })));
    await user.click(screen.getByRole("button", { name: "Reload library" }));
    await screen.findByRole("heading", { name: "Something went wrong" });
    expect(screen.getByText(`${status} · SERVER ERROR`)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Your library" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeVisible();
    expect(screen.getByText("library-failure-1")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("library-failure-2")).toBeVisible();

    route.pathname = "/history";
    rerender(workspace(<h1>History</h1>));
    expect(screen.getByRole("heading", { name: "History" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Something went wrong" })).not.toBeInTheDocument();
  });

  it.each([403, 429, 499])("keeps a %i error inline, displays its request ID, and recovers", async (status) => {
    const user = userEvent.setup();
    server.use(http.get("*/library", () => HttpResponse.json({}, { status, headers: { "X-Request-ID": "library-unavailable" } })));
    render(workspace());
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Could not load library");
    expect(within(error).getByText("library-unavailable")).toBeVisible();
    await user.click(within(error).getByRole("button", { name: "Copy ID" }));
    expect(await navigator.clipboard.readText()).toBe("library-unavailable");
    server.use(http.get("*/library", () => HttpResponse.json({ title: "Your library" })));
    await user.click(within(error).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Your library" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the server error page without inventing an ID when the header is missing", async () => {
    server.use(http.get("*/library", () => HttpResponse.json({}, { status: 500 })));
    renderForExpectedServerError(workspace());
    await screen.findByRole("heading", { name: "Something went wrong" });
    expect(screen.queryByText("Request ID")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy ID" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("keeps the current location when signing in again from another page", async () => {
    window.history.replaceState(null, "", "/library?sort=title");
    server.use(http.get("*/library", () => HttpResponse.json({ code: "session_expired" }, { status: 401, headers: { "X-Request-ID": "expired-library-session" } })));
    render(workspace());
    const error = await screen.findByRole("alert");
    expect(within(error).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/auth/login?returnTo=%2Flibrary%3Fsort%3Dtitle");
    expect(within(error).getByText("expired-library-session")).toBeVisible();
    expect(within(error).queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
