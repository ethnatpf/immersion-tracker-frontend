import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test/render";
import { server } from "@/test/server";
import { Toaster } from "@/components/shadcn/sonner";
import { SessionDialog } from "@/components/session-dialog";
import { getDashboardStatisticsMockHandler, getImmersionSessionHistoryMockHandler, getLanguageListMockHandler, getUserPreferencesMockHandler } from "@/lib/api/generated/immersion.msw";
import type { DashboardStatisticsResponseDto, LanguageResponseDto, SessionHistoryResponseDto } from "@/lib/api/generated/models";
import { Dashboard } from "./dashboard";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const languages: LanguageResponseDto[] = [
  { id: "ja", code: "ja", name: "Japanese", nativeName: "日本語" },
  { id: "es", code: "es", name: "Spanish", nativeName: "Español" },
];
const stats: DashboardStatisticsResponseDto = {
  total_immersion_time: 1736100, current_streak: 42, reading_time: 3600, audiovisual_time: 1732500, average_time: 7200,
  breakdown: [{ start_date: "2026-10-19", reading_time: 1800, audiovisual_time: 7200 }, { start_date: "2026-10-20", reading_time: 1800, audiovisual_time: 3600 }],
};
const history: SessionHistoryResponseDto = {
  items: [{ id: "session-1", content_id: "book-1", type: "book", title: "A Japanese novel", duration: 6300, created_at: "2026-10-24T15:00:00Z" }],
  total: 1, page: 1, limit: 5,
};
let statisticsRequests: URL[];

beforeEach(() => {
  router.push.mockClear();
  statisticsRequests = [];
  server.use(
    getLanguageListMockHandler(languages),
    getUserPreferencesMockHandler({ preferred_language: "es" }),
    getDashboardStatisticsMockHandler(({ request }) => {
      statisticsRequests.push(new URL(request.url));
      return stats;
    }),
    getImmersionSessionHistoryMockHandler(history),
  );
});

describe("dashboard", () => {
  it("uses the default episode duration for a new anime session", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "anime",
          title: "New anime",
          created_at: "2026-10-24",
          duration: 0,
        }}
        open
        onOpenChange={vi.fn()}
        title="Log new session"
        saveLabel="Save session"
        requireEpisodeProgress
        onSave={onSave}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Episodes watched" }), "12");
    expect(screen.getByRole("spinbutton", { name: "Episode duration" })).toHaveValue(24);
    await user.click(screen.getByRole("button", { name: "Save session" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        created_at: "2026-10-24",
        duration: 1440,
        progress: { unit: "episode", start: 12, end: 12 },
      }),
    );
  });

  it("links the session action to the logging page", async () => {
    renderWithQuery(<Dashboard />);
    expect(screen.getByRole("link", { name: "Log new session" })).toHaveAttribute("href", "/log-session");
    await screen.findByRole("region", { name: "Total immersion" });
  });
  it("loads the preferred language and binds metrics, charts, and recent sessions to the SDK responses", async () => {
    renderWithQuery(<Dashboard />);
    const total = await screen.findByRole("region", { name: "Total immersion" });
    expect(within(total).getByText("482:15:00")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Current streak" })).getByText("42")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Reading time" })).getByText("1.0h")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Dashboard language" })).toHaveTextContent("Spanish");
    expect(statisticsRequests[0].searchParams.get("language")).toBe("es");
    expect(statisticsRequests[0].searchParams.get("range")).toBe("week");
    expect(statisticsRequests[0].pathname).toBe("/api/backend/dashboard/statistics");
    const chart = screen.getByRole("region", { name: "Reading media breakdown" });
    expect(within(chart).getByRole("table", { name: "Reading media breakdown data", hidden: true })).toHaveTextContent("00:30:00");
    const recent = await screen.findByRole("table", { name: "Recent immersion sessions" });
    expect(within(recent).getByText("A Japanese novel")).toBeVisible();
    expect(within(recent).getByText("01:45:00")).toBeVisible();
    expect(within(recent).getByText("Oct 24, 2026")).toBeVisible();
    expect(screen.getByRole("link", { name: "View complete history" })).toHaveAttribute("href", "/history");
  });

  it("waits for user preferences before requesting statistics", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    server.use(getUserPreferencesMockHandler(async () => { await pending; return { preferred_language: "es" }; }));
    renderWithQuery(<Dashboard />);
    expect(screen.getByRole("status", { name: "Loading dashboard statistics" })).toBeVisible();
    await screen.findByRole("table", { name: "Recent immersion sessions" });
    expect(statisticsRequests).toHaveLength(0);
    expect(screen.getByRole("combobox", { name: "Dashboard language" })).toBeDisabled();
    release();
    await screen.findByRole("region", { name: "Total immersion" });
    expect(statisticsRequests.map((url) => url.searchParams.get("language"))).toEqual(["es"]);
  });

  it("updates statistics when the user changes period or language", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Dashboard />);
    await screen.findByRole("region", { name: "Total immersion" });
    await user.click(screen.getByRole("tab", { name: "Monthly" }));
    await waitFor(() => expect(statisticsRequests.at(-1)?.searchParams.get("range")).toBe("month"));
    await user.click(screen.getByRole("combobox", { name: "Dashboard language" }));
    await user.click(await screen.findByRole("option", { name: "Japanese" }));
    await waitFor(() => expect(statisticsRequests.at(-1)?.searchParams.get("language")).toBe("ja"));
    expect(statisticsRequests.at(-1)?.searchParams.get("range")).toBe("month");
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute("aria-selected", "true");
  });

  it.each([null, "removed-language"])("falls back to an available language for preference %s", async (preferred_language) => {
    server.use(getUserPreferencesMockHandler({ preferred_language }));
    renderWithQuery(<Dashboard />);
    await screen.findByRole("region", { name: "Total immersion" });
    expect(statisticsRequests[0].searchParams.get("language")).toBe("ja");
  });

  it("filters languages by name and selects a search result with the keyboard", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Dashboard />);
    await screen.findByRole("region", { name: "Total immersion" });
    const language = screen.getByRole("combobox", { name: "Dashboard language" });
    await user.click(language);
    const search = await screen.findByRole("combobox", { name: "Search languages" });
    await user.type(search, "JAP");
    expect(await screen.findByRole("option", { name: "Japanese" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Spanish" })).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(statisticsRequests.at(-1)?.searchParams.get("language")).toBe("ja"));
    expect(language).toHaveTextContent("Japanese");
    expect(screen.queryByRole("combobox", { name: "Search languages" })).not.toBeInTheDocument();
  });

  it("keeps the selected language when a search has no matches", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Dashboard />);
    await screen.findByRole("region", { name: "Total immersion" });
    const language = screen.getByRole("combobox", { name: "Dashboard language" });
    await user.click(language);
    const search = await screen.findByRole("combobox", { name: "Search languages" });
    await user.type(search, "unknown language");
    expect(await screen.findByText("No languages found")).toBeVisible();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await user.clear(search);
    expect(await screen.findByRole("option", { name: "Spanish" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(language).toHaveTextContent("Spanish");
    expect(statisticsRequests).toHaveLength(1);
  });

  it("searches by language code and clears the search without changing the selection", async () => {
    const user = userEvent.setup();
    server.use(getLanguageListMockHandler([...languages, { id: "zh", code: "zh", name: "Chinese", nativeName: "中文" }]));
    renderWithQuery(<Dashboard />);
    await screen.findByRole("region", { name: "Total immersion" });
    const language = screen.getByRole("combobox", { name: "Dashboard language" });
    await user.click(language);
    const search = await screen.findByRole("combobox", { name: "Search languages" });
    await user.type(search, "ZH");
    expect(await screen.findByRole("option", { name: "Chinese" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Spanish" })).not.toBeInTheDocument();
    expect(screen.getByText("1 RESULT")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(screen.getByRole("option", { name: "Spanish" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Japanese" })).toBeVisible();
    expect(statisticsRequests).toHaveLength(1);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("combobox", { name: "Search languages" })).not.toBeInTheDocument());
    await user.click(language);
    expect(await screen.findByRole("combobox", { name: "Search languages" })).toHaveValue("");
  });

  it("displays native names from the API and searches by them", async () => {
    const user = userEvent.setup();
    renderWithQuery(<Dashboard />);
    await screen.findByRole("region", { name: "Total immersion" });
    const language = screen.getByRole("combobox", { name: "Dashboard language" });
    await user.click(language);
    expect(within(await screen.findByRole("option", { name: "Japanese" })).getByText("日本語")).toBeVisible();
    expect(within(screen.getByRole("option", { name: "Spanish" })).getByText("Español")).toBeVisible();
    await user.type(screen.getByRole("combobox", { name: "Search languages" }), "日本語");
    expect(screen.getByRole("option", { name: "Japanese" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Spanish" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Japanese" }));
    await waitFor(() => expect(statisticsRequests.at(-1)?.searchParams.get("language")).toBe("ja"));
    expect(language).toHaveTextContent("Japanese (日本語)");
  });

  it("does not request statistics without any available languages", async () => {
    server.use(getLanguageListMockHandler([]));
    renderWithQuery(<Dashboard />);
    expect(await screen.findByText("No languages are available yet.")).toBeVisible();
    expect(statisticsRequests).toHaveLength(0);
    expect(screen.getByRole("combobox", { name: "Dashboard language" })).toBeDisabled();
  });

  it("shows empty statistics and sessions without inventing data", async () => {
    server.use(getDashboardStatisticsMockHandler({ total_immersion_time: 0, reading_time: 0, audiovisual_time: 0, average_time: 0, current_streak: 0, breakdown: [] }), getImmersionSessionHistoryMockHandler({ items: [], total: 0, page: 1, limit: 5 }));
    renderWithQuery(<Dashboard />);
    expect(await screen.findByText("No reading immersion in this period.")).toBeVisible();
    expect(screen.getByText("No audiovisual immersion in this period.")).toBeVisible();
    expect(await screen.findByText("No immersion sessions yet. Your sessions will appear here.")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Total immersion" })).getByText("00:00:00")).toBeVisible();
    expect(screen.queryByRole("button", { name: /sessions page/ })).not.toBeInTheDocument();
  });

  it("recovers from a statistics failure while keeping the recent log available", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/dashboard/statistics", () => HttpResponse.json({ message: "Too many requests" }, { status: 429, headers: { "X-Request-ID": "stats-unavailable-123" } })));
    renderWithQuery(<Dashboard />);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Could not load dashboard statistics");
    expect(within(error).getByText("stats-unavailable-123")).toBeVisible();
    expect(await screen.findByRole("table", { name: "Recent immersion sessions" })).toBeVisible();
    server.use(getDashboardStatisticsMockHandler(stats));
    await user.click(within(error).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Total immersion" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers sign-in when the frontend session expires", async () => {
    server.use(http.get("*/user/preferences", () => HttpResponse.json({ code: "session_expired" }, { status: 401 })));
    renderWithQuery(<Dashboard />);
    const error = await screen.findByRole("alert");
    expect(within(error).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/auth/login?returnTo=%2F");
    expect(statisticsRequests).toHaveLength(0);
  });

  it("does not ask signed-in users to log in again when the backend rejects their token", async () => {
    server.use(http.get("*/user/preferences", () => HttpResponse.json({ code: "api_unauthorized" }, { status: 401 })));
    renderWithQuery(<Dashboard />);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Your sign-in succeeded, but the server could not authorize this request.");
    expect(within(error).queryByRole("link", { name: "Sign in again" })).not.toBeInTheDocument();
    expect(within(error).getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("shows only the latest five sessions without pagination", async () => {
    const sessionItems = Array.from({ length: 5 }, (_, index) => ({
      ...history.items[0],
      id: `session-${index + 1}`,
      title: `Recent novel ${index + 1}`,
    }));
    const historyRequests: URL[] = [];
    server.use(getImmersionSessionHistoryMockHandler(({ request }) => {
      historyRequests.push(new URL(request.url));
      return { items: sessionItems, total: 8, page: 1, limit: 5 };
    }));
    renderWithQuery(<Dashboard />);
    const recent = await screen.findByRole("table", { name: "Recent immersion sessions" });
    for (const session of sessionItems) {
      expect(within(recent).getByText(session.title)).toBeVisible();
    }
    expect(within(recent).getAllByRole("row")).toHaveLength(6);
    expect(historyRequests).toHaveLength(1);
    expect(historyRequests[0].searchParams.get("page")).toBe("1");
    expect(historyRequests[0].searchParams.get("limit")).toBe("5");
    expect(screen.queryByRole("button", { name: /sessions page/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Page \d+ \/ \d+/)).not.toBeInTheDocument();
  });

  it("edits a session date and duration from its actions menu", async () => {
    const user = userEvent.setup();
    let current: SessionHistoryResponseDto = {
      ...history,
      items: [{
        ...history.items[0],
        type: "anime" as const,
        duration: 2880,
        progress: { unit: "episode" as const, start: 2, end: 3 },
      }],
    };
    let updateBody: unknown;
    let historyRequests = 0;
    let releaseRefresh!: () => void;
    const refreshPending = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    server.use(
      getImmersionSessionHistoryMockHandler(async () => {
        historyRequests += 1;
        if (historyRequests > 1) await refreshPending;
        return current;
      }),
      http.patch("*/immersion-session/:id", async ({ request, params }) => {
        expect(params.id).toBe("session-1");
        updateBody = await request.json();
        current = {
          ...history,
          items: [
            {
              ...history.items[0],
              type: "anime",
              created_at: "2026-10-23T00:00:00.000Z",
              duration: 5400,
              progress: { unit: "episode", start: 2, end: 4 },
            },
          ],
        };
        return HttpResponse.json({ _id: "session-1" });
      }),
    );
    renderWithQuery(<Dashboard />);

    const recent = await screen.findByRole("table", {
      name: "Recent immersion sessions",
    });
    await user.click(within(recent).getByRole("button", { name: "Actions for A Japanese novel" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit session" }));
    expect(await screen.findByRole("dialog", { name: "Edit session" })).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Episodes watched" })).toHaveValue("2–3"),
    );
    await user.clear(screen.getByRole("textbox", { name: "Episodes watched" }));
    await user.type(screen.getByRole("textbox", { name: "Episodes watched" }), "2–4");
    await user.clear(screen.getByRole("spinbutton", { name: "Episode duration" }));
    await user.type(screen.getByRole("spinbutton", { name: "Episode duration" }), "30");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(historyRequests).toBeGreaterThan(1));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    releaseRefresh();
    await waitFor(() =>
      expect(updateBody).toEqual({
        created_at: "2026-10-24",
        duration: 5400,
        progress: { unit: "episode", start: 2, end: 4 },
      }),
    );
    expect(await within(recent).findByText("01:30:00")).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Edit session" })).not.toBeInTheDocument();
  });

  it("uses page-range fields for a reading session", async () => {
    const user = userEvent.setup();
    let updateBody: unknown;
    server.use(getImmersionSessionHistoryMockHandler({
      ...history,
      items: [{
        ...history.items[0],
        progress: { unit: "page", start: 156, end: 188 },
      }],
    }), http.patch("*/immersion-session/:id", async ({ request }) => {
      updateBody = await request.json();
      return HttpResponse.json({ _id: "session-1" });
    }));
    renderWithQuery(<Dashboard />);

    const recent = await screen.findByRole("table", {
      name: "Recent immersion sessions",
    });
    await user.click(
      within(recent).getByRole("button", {
        name: "Actions for A Japanese novel",
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit session" }));

    expect(await screen.findByRole("spinbutton", { name: "Page from" })).toHaveValue(156);
    expect(screen.getByRole("spinbutton", { name: "Page to" })).toHaveValue(188);
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveValue(1);
    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(45);
    expect(screen.queryByRole("textbox", { name: "Episodes watched" })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("spinbutton", { name: "Page from" }));
    await user.type(screen.getByRole("spinbutton", { name: "Page from" }), "160");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(updateBody).toEqual({
        created_at: "2026-10-24",
        duration: 6300,
        progress: { unit: "page", start: 160, end: 188 },
      }),
    );
    expect(screen.queryByRole("dialog", { name: "Edit session" })).not.toBeInTheDocument();
  });

  it("keeps manual duration fields for video sessions", async () => {
    const user = userEvent.setup();
    server.use(
      getImmersionSessionHistoryMockHandler({
        ...history,
        items: [{ ...history.items[0], type: "video" }],
      }),
    );
    renderWithQuery(<Dashboard />);

    const recent = await screen.findByRole("table", {
      name: "Recent immersion sessions",
    });
    await user.click(
      within(recent).getByRole("button", {
        name: "Actions for A Japanese novel",
      }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit session" }));

    expect(await screen.findByRole("spinbutton", { name: "Hours" })).toHaveValue(1);
    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(45);
    expect(screen.getByRole("spinbutton", { name: "Seconds" })).toHaveValue(0);
    expect(screen.queryByRole("textbox", { name: "Episodes watched" })).not.toBeInTheDocument();
  });

  it("opens the content detail when a recent-session row is clicked", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <>
        <Dashboard />
        <Toaster />
      </>,
    );

    const recent = await screen.findByRole("table", {
      name: "Recent immersion sessions",
    });
    const row = within(recent).getByRole("row", { name: /A Japanese novel/ });
    expect(within(row).getByRole("link", { name: "A Japanese novel" })).toHaveAttribute("href", "/content/book-1");
    await user.click(
      within(row).getByRole("button", { name: "Actions for A Japanese novel" }),
    );
    const menu = await screen.findByRole("menu");
    expect(
      within(menu).queryByRole("menuitem", { name: "View content" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(within(row).getByText("01:45:00"));
    expect(router.push).toHaveBeenCalledWith("/content/book-1");
  });

  it("deletes a session after confirmation from its actions menu", async () => {
    const user = userEvent.setup();
    let current = history;
    let deletedPath = "";
    let historyRequests = 0;
    let releaseRefresh!: () => void;
    const refreshPending = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    server.use(
      getImmersionSessionHistoryMockHandler(async () => {
        historyRequests += 1;
        if (historyRequests > 1) await refreshPending;
        return current;
      }),
      http.delete("*/immersion-session/:id", ({ params }) => {
        deletedPath = String(params.id);
        current = { ...history, items: [], total: 0 };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithQuery(<Dashboard />);

    const recent = await screen.findByRole("table", {
      name: "Recent immersion sessions",
    });
    await user.click(within(recent).getByRole("button", { name: "Actions for A Japanese novel" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete session" }));
    expect(await screen.findByRole("dialog", { name: "Delete this session?" })).toBeVisible();
    expect(deletedPath).toBe("");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Delete this session?" })).not.toBeInTheDocument();
    expect(within(recent).getByText("A Japanese novel")).toBeVisible();
    expect(deletedPath).toBe("");
    await user.click(within(recent).getByRole("button", { name: "Actions for A Japanese novel" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete session" }));
    await user.click(screen.getByRole("button", { name: "Delete session" }));

    await waitFor(() => expect(historyRequests).toBeGreaterThan(1));
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    releaseRefresh();
    expect(await screen.findByText("No immersion sessions yet. Your sessions will appear here.")).toBeVisible();
    expect(deletedPath).toBe("session-1");
  });

  it("recovers from a recent-log failure without hiding the statistics", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/immersion-session", () => HttpResponse.json({}, { status: 429 })));
    renderWithQuery(<Dashboard />);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Could not load recent sessions");
    await screen.findByRole("region", { name: "Total immersion" });
    server.use(getImmersionSessionHistoryMockHandler(history));
    await user.click(within(error).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table", { name: "Recent immersion sessions" })).toBeVisible();
  });

  it.each(["language", "user/preferences", "dashboard/statistics", "immersion-session"])("replaces the page for a 500 from %s and recovers on retry", async (endpoint) => {
    const user = userEvent.setup();
    server.use(http.get(`*/${endpoint}`, () => HttpResponse.json({ message: "Internal details" }, { status: 500, headers: { "X-Request-ID": `failed-${endpoint}` } })));
    renderWithQuery(<Dashboard />);
    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeVisible();
    expect(screen.getByText("500 · SERVER ERROR")).toBeVisible();
    expect(screen.getByText(`failed-${endpoint}`)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Immersion dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Recent immersion sessions" })).not.toBeInTheDocument();
    expect(screen.queryByText("Internal details")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: "Copy ID" }));
    expect(await navigator.clipboard.readText()).toBe(`failed-${endpoint}`);
    server.resetHandlers();
    server.use(getLanguageListMockHandler(languages), getUserPreferencesMockHandler({ preferred_language: "es" }), getDashboardStatisticsMockHandler(stats), getImmersionSessionHistoryMockHandler(history));
    await user.click(screen.getByRole("button", { name: "Try again" }));
    const total = await screen.findByRole("region", { name: "Total immersion" });
    expect(within(total).getByText("482:15:00")).toBeVisible();
    expect(await screen.findByRole("table", { name: "Recent immersion sessions" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Something went wrong" })).not.toBeInTheDocument();
  });
});
