import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "@/test/render";
import { server } from "@/test/server";
import { toast } from "sonner";
import { Toaster } from "@/components/shadcn/sonner";
import {
  getContentCreateMockHandler,
  getContentSearchMockHandler,
  getImmersionSessionCreateMockHandler,
  getLanguageListMockHandler,
  getUserPreferencesMockHandler,
} from "@/lib/api/generated/immersion.msw";
import type {
  ContentResponseDto,
  CreateImmersionSessionDto,
  ImmersionSessionResponseDto,
} from "@/lib/api/generated/models";
import { SessionEntryForm } from "./session-entry-form";
import { Dashboard } from "@/components/dashboard/dashboard";
import {
  getDashboardStatisticsMockHandler,
  getImmersionSessionHistoryMockHandler,
} from "@/lib/api/generated/immersion.msw";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const content: ContentResponseDto = {
  _id: "new-content",
  title: "Kitchen",
  language: "language-ja",
  type: "book",
  completed: false,
  user_id: "reader",
};
const saved: ImmersionSessionResponseDto = {
  _id: "session",
  content: "existing-content",
  language: "language-ja",
  content_type: "anime",
  user_id: "reader",
  duration: 5760,
  created_at: "2026-01-01T00:00:00Z",
};
let searches: URL[];
let writes: CreateImmersionSessionDto[];
let creates: unknown[];
afterEach(() => {
  toast.dismiss();
  vi.useRealTimers();
});

beforeEach(() => {
  push.mockReset();
  searches = [];
  writes = [];
  creates = [];
  server.use(
    getLanguageListMockHandler([
      { id: "language-ja", code: "ja", name: "Japanese", nativeName: "日本語" },
      { id: "language-es", code: "es", name: "Spanish", nativeName: "Español" },
    ]),
    getUserPreferencesMockHandler({ preferred_language: "language-ja" }),
    getContentSearchMockHandler(({ request }) => {
      const url = new URL(request.url);
      searches.push(url);
      return {
        items:
          url.searchParams.get("q") === "Fullmetal"
            ? [
                {
                  id: "existing-content",
                  title: "Fullmetal Alchemist",
                  type: "anime",
                },
              ]
            : [],
        total: url.searchParams.get("q") === "Fullmetal" ? 1 : 0,
        page: 1,
        limit: 20,
      };
    }),
    getContentCreateMockHandler(async ({ request }) => {
      creates.push(await request.json());
      return content;
    }),
    getImmersionSessionCreateMockHandler(async ({ request }) => {
      writes.push((await request.json()) as CreateImmersionSessionDto);
      return saved;
    }),
  );
});

async function selectExisting() {
  const user = userEvent.setup();
  await screen.findByText("Japanese (日本語)");
  const input = await screen.findByRole("combobox", { name: "Title / search" });
  await waitFor(() => expect(input).toBeEnabled());
  await user.type(input, "Fullmetal");
  await user.click(
    await screen.findByRole("option", { name: /Fullmetal Alchemist/ }),
  );
  await user.type(screen.getByLabelText("Episodes watched"), "61–64");
  return user;
}

describe("session entry form", () => {
  it.each(["session_expired", "api_unauthorized"])(
    "presents a mutation authorization failure in a toast: %s",
    async (code) => {
      server.use(
        http.post("*/api/backend/immersion-session", () =>
          HttpResponse.json({ code, message: "Unauthorized" }, { status: 401 }),
        ),
      );
      renderWithQuery(
        <>
          <SessionEntryForm />
          <Toaster />
        </>,
      );
      const user = await selectExisting();
      await user.click(screen.getByRole("button", { name: "Save session" }));
      const notifications = screen.getByRole("region", {
        name: /Notifications/,
      });
      expect(
        await within(notifications).findByText(
          code === "session_expired"
            ? "Your session needs to be renewed. Please sign in again."
            : "The server could not authorize this request. Please try again.",
        ),
      ).toBeVisible();
      if (code === "session_expired")
        expect(
          within(notifications).getByRole("button", { name: "Sign in again" }),
        ).toBeVisible();
      else
        expect(
          within(notifications).queryByRole("button", {
            name: "Sign in again",
          }),
        ).not.toBeInTheDocument();
      expect(screen.getByLabelText("Episodes watched")).toHaveValue("61–64");
    },
  );
  it.each([
    { message: "url must be a URL address" },
    { message: ["url must be a URL address", "title is already in use"] },
  ])(
    "shows backend 4xx messages in a toast and preserves the draft: %j",
    async ({ message }) => {
      server.use(
        http.post("*/api/backend/immersion-session", () =>
          HttpResponse.json(
            { message, error: "Bad Request", statusCode: 400 },
            { status: 400 },
          ),
        ),
      );
      renderWithQuery(
        <>
          <SessionEntryForm />
          <Toaster />
        </>,
      );
      const user = await selectExisting();
      await user.click(screen.getByRole("button", { name: "Save session" }));
      await screen.findByText("url must be a URL address");
      const notifications = screen.getByRole("region", {
        name: /Notifications/,
      });
      expect(
        within(notifications).getByText("url must be a URL address"),
      ).toBeVisible();
      if (Array.isArray(message))
        expect(
          within(notifications).getByText("title is already in use"),
        ).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Episodes watched")).toHaveValue("61–64");
      expect(push).not.toHaveBeenCalled();
      server.use(getImmersionSessionCreateMockHandler(saved));
      await user.click(screen.getByRole("button", { name: "Save session" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    },
  );
  it("supports choosing a log date with the keyboard", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:30:00Z"));
    const user = userEvent.setup();
    renderWithQuery(<SessionEntryForm />);
    await user.click(screen.getByRole("button", { name: "Log date" }));
    const selectedDay = await screen.findByRole("button", {
      name: /October 25th, 2026/,
    });
    await waitFor(() => expect(selectedDay).toHaveFocus());
    await user.keyboard("{ArrowLeft}{Enter}");
    expect(screen.getByRole("button", { name: "Log date" })).toHaveTextContent(
      "Oct 24, 2026",
    );
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("explains why title search is disabled until a language is selected", async () => {
    server.use(getUserPreferencesMockHandler({ preferred_language: null }));
    const user = userEvent.setup();
    renderWithQuery(<SessionEntryForm />);
    await screen.findByText("Choose a language");
    const input = screen.getByRole("combobox", { name: "Title / search" });
    expect(input).toBeDisabled();
    const unavailableSearch = screen.getByRole("group", {
      name: "Title search unavailable",
    });
    await user.hover(unavailableSearch);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Select a language first.",
    );
    await user.unhover(unavailableSearch);
    await user.click(screen.getByRole("combobox", { name: "Language" }));
    await user.click(await screen.findByRole("option", { name: "Japanese" }));
    expect(
      screen.getByRole("combobox", { name: "Title / search" }),
    ).toBeEnabled();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
  it("logs Video with manual viewing time instead of episodes", async () => {
    renderWithQuery(<SessionEntryForm />);
    const user = userEvent.setup();
    await screen.findByText("Japanese (日本語)");
    await user.click(screen.getByRole("radio", { name: "Video" }));
    expect(screen.getByText("Enter your viewing time.")).toBeVisible();
    expect(screen.queryByLabelText("Episodes watched")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("From page")).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("combobox", { name: "Title / search" }),
      "Lecture",
    );
    await user.click(
      await screen.findByRole("option", { name: /Create.*Lecture/ }),
    );
    await user.clear(screen.getByLabelText("Minutes"));
    await user.type(screen.getByLabelText("Minutes"), "35");
    await user.click(screen.getByRole("button", { name: "Save session" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(creates[0]).toMatchObject({ title: "Lecture", type: "video" });
    expect(writes[0]).toMatchObject({ duration: 2100 });
    expect(writes[0].progress).toBeUndefined();
  });
  it("selects a log date from the calendar and saves that calendar day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:30:00Z"));
    renderWithQuery(<SessionEntryForm />);
    const user = await selectExisting();
    const trigger = screen.getByRole("button", { name: "Log date" });
    expect(trigger).toHaveTextContent("Oct 25, 2026");
    await user.click(trigger);
    expect(
      await screen.findByRole("button", { name: /October 26th, 2026/ }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /previous month/i }));
    await user.click(
      await screen.findByRole("button", { name: /September 30th, 2026/ }),
    );
    expect(screen.getByRole("button", { name: "Log date" })).toHaveTextContent(
      "Sep 30, 2026",
    );
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save session" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(writes[0].created_at).toBe("2026-09-30");
  });

  it("searches languages by native name and selects with the keyboard", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SessionEntryForm />);
    await screen.findByText("Japanese (日本語)");
    await user.click(screen.getByRole("combobox", { name: "Language" }));
    await user.type(
      await screen.findByRole("combobox", { name: "Search languages" }),
      "Español",
    );
    expect(
      screen.queryByRole("option", { name: "Japanese" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(
      screen.getByRole("combobox", { name: "Language" }),
    ).toHaveTextContent("Spanish (Español)");
    await user.type(
      screen.getByRole("combobox", { name: "Title / search" }),
      "Un libro",
    );
    expect(
      await screen.findByRole("option", { name: /Create.*Un libro/ }),
    ).toBeVisible();
    expect(searches.at(-1)?.searchParams.get("language")).toBe("language-es");
  });

  it("shows loading until settings arrive and requires a language when there is no valid preference", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      getUserPreferencesMockHandler(async () => {
        await pending;
        return { preferred_language: "removed" };
      }),
    );
    renderWithQuery(<SessionEntryForm />);
    expect(
      screen.getByRole("status", { name: "Loading session settings" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Save session" })).toBeDisabled();
    expect(
      screen.queryByRole("combobox", { name: "Language" }),
    ).not.toBeInTheDocument();
    release();
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Loading session settings" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("combobox", { name: "Title / search" }),
    ).toBeDisabled();
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Language" }));
    await user.click(await screen.findByRole("option", { name: /Spanish/ }));
    await user.type(
      screen.getByRole("combobox", { name: "Title / search" }),
      "Un libro",
    );
    expect(
      await screen.findByRole("option", { name: /Create.*Un libro/ }),
    ).toBeVisible();
    expect(searches.at(-1)?.searchParams.get("language")).toBe("language-es");
  });

  it("filters search results by type and language and paginates real results", async () => {
    server.use(
      getContentSearchMockHandler(({ request }) => {
        const url = new URL(request.url);
        searches.push(url);
        const page = Number(url.searchParams.get("page"));
        if (url.searchParams.get("q") === "video result 2")
          return {
            items:
              page === 1
                ? [{ id: "content-2", title: "video result 2", type: "video" }]
                : [],
            total: 1,
            page,
            limit: 20,
          };
        return {
          items: [
            {
              id: `content-${page}`,
              title: `${url.searchParams.get("type")} result ${page}`,
              type: "video",
            },
          ],
          total: 21,
          page,
          limit: 20,
        };
      }),
    );
    renderWithQuery(<SessionEntryForm />);
    const user = userEvent.setup();
    await screen.findByText("Japanese (日本語)");
    await user.click(screen.getByRole("radio", { name: "Video" }));
    await user.type(
      screen.getByRole("combobox", { name: "Title / search" }),
      "lesson",
    );
    expect(
      await screen.findByRole("option", { name: "video result 1" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Next results" }));
    expect(
      await screen.findByRole("option", { name: "video result 2" }),
    ).toBeVisible();
    expect(searches.at(-1)?.searchParams.get("page")).toBe("2");
    await user.click(screen.getByRole("option", { name: "video result 2" }));
    await waitFor(() =>
      expect(searches.at(-1)?.searchParams.get("q")).toBe("video result 2"),
    );
    await user.click(screen.getByRole("combobox", { name: "Title / search" }));
    expect(
      await screen.findByRole("option", {
        name: "video result 2",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: /Create.*video result 2/ }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("combobox", { name: "Language" }));
    await user.click(await screen.findByRole("option", { name: /Spanish/ }));
    expect(
      screen.getByRole("combobox", { name: "Title / search" }),
    ).toHaveValue("");
    await user.type(
      screen.getByRole("combobox", { name: "Title / search" }),
      "lesson",
    );
    expect(
      await screen.findByRole("option", { name: "video result 1" }),
    ).toBeVisible();
    expect(searches.at(-1)?.searchParams.get("language")).toBe("language-es");
    expect(searches.at(-1)?.searchParams.get("type")).toBe("video");
  });

  it("keeps independent controls usable when there are no languages", async () => {
    server.use(getLanguageListMockHandler([]));
    renderWithQuery(<SessionEntryForm />);
    expect(
      await screen.findByText(
        "No languages available. A language is needed to log a session.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Save session" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Cancel entry" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("radio", { name: "Book" })).toBeEnabled();
  });

  it("blocks duplicate submissions while saving", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      getImmersionSessionCreateMockHandler(async ({ request }) => {
        writes.push((await request.json()) as CreateImmersionSessionDto);
        await pending;
        return saved;
      }),
    );
    renderWithQuery(<SessionEntryForm />);
    const user = await selectExisting();
    await user.dblClick(screen.getByRole("button", { name: "Save session" }));
    expect(
      screen.getByRole("button", { name: "Saving session…" }),
    ).toBeDisabled();
    expect(writes).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("refreshes visible dashboard sessions and statistics after saving", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    server.use(
      getDashboardStatisticsMockHandler(() => ({
        total_immersion_time: writes.length ? 5760 : 0,
        current_streak: 0,
        reading_time: 0,
        audiovisual_time: writes.length ? 5760 : 0,
        average_time: 0,
        breakdown: [],
      })),
      getImmersionSessionHistoryMockHandler(() => ({
        items: writes.length
          ? [
              {
                id: "session",
                content_id: "existing-content",
                title: "Saved anime session",
                type: "anime",
                duration: 5760,
                created_at: "2026-01-01T00:00:00Z",
              },
            ]
          : [],
        total: writes.length,
        page: 1,
        limit: 5,
      })),
    );
    renderWithQuery(
      <>
        <Dashboard />
        <SessionEntryForm />
      </>,
    );
    const user = await selectExisting();
    await user.click(screen.getByRole("button", { name: "Save session" }));
    await waitFor(() =>
      expect(screen.getAllByText("Saved anime session")).toHaveLength(2),
    );
    expect(
      screen.getByRole("region", { name: "Total immersion" }),
    ).toHaveTextContent("01:36:00");
  });
  it("searches the backend and saves an existing title with calculated time", async () => {
    renderWithQuery(<SessionEntryForm />);
    const user = await selectExisting();
    expect(searches.at(-1)?.searchParams.get("language")).toBe("language-ja");
    expect(searches.at(-1)?.searchParams.get("type")).toBe("anime");
    expect(screen.getByText("01:36:00")).toBeVisible();
    expect(
      screen.queryByLabelText("Reference link (optional)"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save session" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(writes[0]).toMatchObject({
      content: "existing-content",
      duration: 5760,
      progress: { unit: "episode", start: 61, end: 64 },
    });
    expect(creates).toHaveLength(0);
  });

  it.each([422, 503])(
    "creates a new book only on save and reuses it after a %i session-save failure",
    async (status) => {
      server.use(
        http.post("*/api/backend/immersion-session", async ({ request }) => {
          writes.push((await request.json()) as CreateImmersionSessionDto);
          return writes.length === 1
            ? HttpResponse.json(
                {},
                { status, headers: { "X-Request-ID": "save-failed" } },
              )
            : HttpResponse.json(saved);
        }),
      );
      const user = userEvent.setup();
      renderWithQuery(
        <>
          <SessionEntryForm />
          <Toaster />
        </>,
      );
      await user.click(screen.getByRole("radio", { name: "Book" }));
      await user.type(
        await screen.findByRole("combobox", { name: "Title / search" }),
        "Kitchen",
      );
      await user.click(
        await screen.findByRole("option", { name: /Create.*Kitchen/ }),
      );
      await user.type(
        screen.getByLabelText("Reference link (optional)"),
        "https://example.com/kitchen",
      );
      await user.clear(screen.getByLabelText("Hours"));
      await user.type(screen.getByLabelText("Hours"), "1");
      await user.clear(screen.getByLabelText("Minutes"));
      await user.type(screen.getByLabelText("Minutes"), "15");
      await user.type(screen.getByLabelText("From page"), "156");
      await user.type(screen.getByLabelText("To page"), "188");
      expect(screen.getByText("32 pages logged")).toBeVisible();
      expect(creates).toHaveLength(0);
      await user.click(screen.getByRole("button", { name: "Save session" }));
      expect(
        await screen.findByText(
          status === 503
            ? "503 · SERVER ERROR"
            : "Could not complete this action. Please try again.",
        ),
      ).toBeVisible();
      expect(screen.getByText("save-failed")).toBeVisible();
      if (status === 503) {
        await user.click(screen.getByRole("button", { name: "Try again" }));
        await screen.findByRole("heading", {
          name: /Log an immersion session/,
        });
        expect(writes).toHaveLength(1);
        expect(
          screen.getByRole("combobox", { name: "Title / search" }),
        ).toHaveValue("Kitchen");
      }
      expect(screen.getByLabelText("Hours")).toHaveValue(1);
      await user.click(
        screen.getByRole("button", {
          name: "Save session",
        }),
      );
      await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
      expect(creates).toEqual([
        {
          title: "Kitchen",
          language: "language-ja",
          type: "book",
          url: "https://example.com/kitchen",
        },
      ]);
      expect(writes).toHaveLength(2);
      expect(writes[1]).toMatchObject({
        content: "new-content",
        duration: 4500,
        progress: { unit: "page", start: 156, end: 188 },
      });
    },
  );

  it("keeps a confirmed save locked while dashboard navigation is pending", async () => {
    renderWithQuery(<SessionEntryForm />);
    const user = await selectExisting();
    await user.click(screen.getByRole("button", { name: "Save session" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    await user.click(
      screen.getByRole("button", { name: /^Sav(e|ing) session/ }),
    );
    expect(writes).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /^Sav(e|ing) session/ }),
    ).toBeDisabled();
  });

  it("validates before writing and clears a content selection after editing its title", async () => {
    renderWithQuery(<SessionEntryForm />);
    const user = await selectExisting();
    await user.type(
      screen.getByRole("combobox", { name: "Title / search" }),
      " revised",
    );
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Save session" }));
    expect(
      await screen.findByText("Select existing content or choose a new title."),
    ).toBeVisible();
    expect(writes).toHaveLength(0);
  });

  it("shows search failures with retry instead of offering new content", async () => {
    server.use(
      http.get("*/api/backend/content/search", () =>
        HttpResponse.json({}, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQuery(<SessionEntryForm />);
    await screen.findByText("Japanese (日本語)");
    const input = await screen.findByRole("combobox", {
      name: "Title / search",
    });
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, "Kitchen");
    expect(await screen.findByText("Could not search content")).toBeVisible();
    expect(
      screen.queryByRole("option", { name: /Create/ }),
    ).not.toBeInTheDocument();
    server.use(
      getContentSearchMockHandler({ items: [], total: 0, page: 1, limit: 20 }),
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(
        screen.queryByText("Could not search content"),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("combobox", { name: "Title / search" }));
    expect(
      await screen.findByRole("option", { name: /Create.*Kitchen/ }),
    ).toBeVisible();
  });

  it("replaces the page on a server write failure and does not resubmit on recovery", async () => {
    server.use(
      http.post("*/api/backend/immersion-session", async ({ request }) => {
        writes.push((await request.json()) as CreateImmersionSessionDto);
        return HttpResponse.json(
          { message: "Internal database exception" },
          { status: 503, headers: { "X-Request-ID": "write-503" } },
        );
      }),
    );
    renderWithQuery(
      <>
        <SessionEntryForm />
        <Toaster />
      </>,
    );
    const user = await selectExisting();
    await user.click(screen.getByRole("button", { name: "Save session" }));
    expect(await screen.findByText("503 · SERVER ERROR")).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: /Notifications/ })).queryByRole(
        "listitem",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Internal database exception"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: /Log an immersion session/ }),
    ).toBeVisible();
    expect(writes).toHaveLength(1);
  });
});
