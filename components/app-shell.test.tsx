import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test/render";
import { AppShell } from "./app-shell";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
beforeEach(() => { route.pathname = "/"; });

function renderShell() {
  return renderWithQuery(
    <AppShell email="reader@example.com"><h1>Immersion dashboard</h1></AppShell>,
  );
}

describe("workspace navigation", () => {
  it("links to the workspace pages", () => {
    renderShell();
    const workspace = screen.getByRole("navigation", { name: "Workspace" });
    expect(within(workspace).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(within(workspace).getByRole("link", { name: "History" })).toHaveAttribute("href", "/history");
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
