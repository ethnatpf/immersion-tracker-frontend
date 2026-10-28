import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { renderWithQuery } from "@/test/render";
import { server } from "@/test/server";
import { AppShell } from "./app-shell";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
beforeEach(() => {
  route.pathname = "/";
  server.use(http.get("*/timer", () =>
    HttpResponse.json({ message: "No active timer" }, { status: 404 }),
  ));
});

function renderShell() {
  return renderWithQuery(
    <AppShell email="reader@example.com"><h1>Immersion dashboard</h1></AppShell>,
  );
}

describe("workspace navigation", () => {
  it("links the brand to the dashboard and closes mobile navigation when selected", async () => {
    const user = userEvent.setup(); renderShell();
    const brandLinks = screen.getAllByRole("link", { name: "Go to dashboard", hidden: true });
    expect(brandLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of brandLinks) expect(link).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    await user.click(within(dialog).getByRole("link", { name: "Go to dashboard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("links session actions to the form and closes mobile navigation", async () => {
    const user = userEvent.setup(); renderShell();
    expect(screen.getByRole("link", { name: "Log new session" })).toHaveAttribute("href", "/log-session");
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    const link = within(dialog).getByRole("link", { name: "Log new session" });
    expect(link).toHaveAttribute("href", "/log-session");
    await user.click(link);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("links to the workspace pages", () => {
    renderShell();
    const workspace = screen.getByRole("navigation", { name: "Workspace" });
    expect(within(workspace).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(within(workspace).getByRole("link", { name: "History" })).toHaveAttribute("href", "/history");
  });

  it("keeps the active timer reduced when the page changes", async () => {
    server.use(http.get("*/timer", () => HttpResponse.json({
      id: "timer-one",
      content_id: "content-one",
      title: "The Dispossessed",
      type: "book",
      started_at: new Date(Date.now() - 90_000).toISOString(),
    })));
    const user = userEvent.setup();
    const { rerender } = renderShell();
    const timer = await screen.findByRole("region", { name: "Active immersion timer" });
    await user.click(within(timer).getByRole("button", { name: "Reduce active timer" }));
    expect(within(timer).getByRole("button", { name: "Expand active timer" })).toBeVisible();

    route.pathname = "/history";
    rerender(<AppShell><h1>History</h1></AppShell>);

    const timerAfterNavigation = await screen.findByRole("region", { name: "Active immersion timer" });
    expect(within(timerAfterNavigation).getByRole("button", { name: "Expand active timer" })).toBeVisible();
    expect(within(timerAfterNavigation).queryByRole("button", { name: "Reduce active timer" })).not.toBeInTheDocument();
  });

  it("opens mobile navigation, closes after selection, and supports dismissal", async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    let dialog = await screen.findByRole("dialog", { name: "Navigation" });
    expect(within(dialog).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await user.click(within(dialog).getByRole("link", { name: "Dashboard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(trigger);
    dialog = await screen.findByRole("dialog", { name: "Navigation" });
    await user.click(within(dialog).getByRole("button", { name: "Close navigation" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Navigation" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it.each(["/", "/history", "/history/session-1", "/history-other"])("selects the active workspace link at %s in both navigation views", async (pathname) => {
    route.pathname = pathname;
    const user = userEvent.setup();
    const { rerender } = renderShell();
    for (const name of ["Workspace", "Mobile workspace"]) {
      if (name === "Mobile workspace") await user.click(screen.getByRole("button", { name: "Open navigation" }));
      const nav = screen.getByRole("navigation", { name });
      const dashboard = within(nav).getByRole("link", { name: "Dashboard" });
      const history = within(nav).getByRole("link", { name: "History" });
      expect(dashboard.getAttribute("aria-current")).toBe(pathname === "/" ? "page" : null);
      expect(history.getAttribute("aria-current")).toBe(pathname === "/history" || pathname.startsWith("/history/") ? "page" : null);
    }
    await user.keyboard("{Escape}");
    route.pathname = "/history";
    rerender(<AppShell><h1>History</h1></AppShell>);
    const nav = screen.getByRole("navigation", { name: "Workspace" });
    expect(within(nav).getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it.each([0, 1])("opens profile menu %i with the signed-in email and working logout", async (index) => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getAllByRole("button", { name: "Open profile menu" })[index];
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Your account")).toBeVisible();
    expect(within(menu).getByText("reader@example.com")).toBeVisible();
    expect(within(menu).getByRole("menuitem", { name: "Log out" })).toHaveAttribute("href", "/auth/logout");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
