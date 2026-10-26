import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { History } from "./history";
import { renderWithQuery } from "@/test/render";
import { server } from "@/test/server";
import { getImmersionSessionHistoryMockHandler } from "@/lib/api/generated/immersion.msw";
import type { SessionHistoryItemResponseDto } from "@/lib/api/generated/models";

const sessions: SessionHistoryItemResponseDto[] = [
  {
    id: "one",
    content_id: "content-one",
    title: "A Japanese novel",
    type: "book",
    created_at: "2026-10-20T00:00:00.000Z",
    duration: 6300,
  },
  {
    id: "two",
    content_id: "content-two",
    title: "An anime episode",
    type: "anime",
    created_at: "2026-10-19T00:00:00.000Z",
    duration: 1500,
  },
];

describe("History", () => {
  it("shows server sessions and uses backend totals to change pages", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    server.use(
      getImmersionSessionHistoryMockHandler(({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page"));
        return {
          items:
            page === 1
              ? [
                  sessions[0],
                  {
                    ...sessions[0],
                    id: "extra-1",
                    title: "Second book",
                    duration: 1200,
                  },
                  {
                    ...sessions[0],
                    id: "extra-2",
                    title: "Third book",
                    duration: 2400,
                  },
                  {
                    ...sessions[0],
                    id: "extra-3",
                    title: "Fourth book",
                    duration: 3600,
                  },
                ]
              : [sessions[1]],
          total: 5,
          page,
          limit: 4,
        };
      }),
    );
    renderWithQuery(<History />);
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
    expect(
      within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).getByText("01:45:00"),
    ).toBeVisible();
    expect(screen.getAllByText("Showing 1–4 of 5 entries")[0]).toBeVisible();
    expect(
      within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).getAllByRole("row"),
    ).toHaveLength(5);
    expect(requests[0].searchParams.get("limit")).toBe("4");
    await user.click(screen.getAllByRole("button", { name: "Next page" })[0]);
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("An anime episode"),
    ).toBeVisible();
    expect(
      within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).queryByText("A Japanese novel"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Page 2 of 2")[0]).toBeVisible();
    expect(requests.map((url) => url.searchParams.get("page"))).toEqual([
      "1",
      "2",
    ]);
  });

  it("associates category tabs with the visible results for screen readers", async () => {
    const user = userEvent.setup();
    server.use(
      getImmersionSessionHistoryMockHandler({
        items: [sessions[0]],
        total: 1,
        page: 1,
        limit: 4,
      }),
    );
    renderWithQuery(<History />);
    await user.click(screen.getByRole("tab", { name: "Reading" }));
    const panel = await screen.findByRole("tabpanel", { name: "Reading" });
    expect(
      within(panel).getByRole("table", { name: "Immersion history" }),
    ).toBeVisible();
  });

  it("offers a way back when an external deletion makes the current page unavailable", async () => {
    const user = userEvent.setup();
    server.use(
      getImmersionSessionHistoryMockHandler(({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return {
          items: page === 1 ? [sessions[0]] : [],
          total: page === 1 ? 5 : 4,
          page,
          limit: 4,
        };
      }),
    );
    renderWithQuery(<History />);
    await within(
      await screen.findByRole("table", { name: "Immersion history" }),
    ).findByText("A Japanese novel");
    await user.click(screen.getAllByRole("button", { name: "Next page" })[0]);
    expect(
      await screen.findByText("This page is no longer available."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Go to last page" }));
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
  });

  it("searches titles through the server and resets to page one", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    server.use(
      getImmersionSessionHistoryMockHandler(({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const searched = url.searchParams.get("q") === "anime";
        return {
          items: searched ? [sessions[1]] : [sessions[0]],
          total: searched ? 1 : 5,
          page: Number(url.searchParams.get("page")),
          limit: 4,
        };
      }),
    );
    renderWithQuery(<History />);
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: "Next page" })[0]);
    await within(
      await screen.findByRole("table", { name: "Immersion history" }),
    ).findByText("A Japanese novel");
    await user.type(
      screen.getByRole("textbox", { name: "Search titles" }),
      "anime",
    );
    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get("q")).toBe("anime"),
    );
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("An anime episode"),
    ).toBeVisible();
    expect(screen.getAllByText("Page 1 of 1")[0]).toBeVisible();
    expect(requests.at(-1)?.searchParams.get("q")).toBe("anime");
    expect(requests.at(-1)?.searchParams.get("page")).toBe("1");
  });

  it("uses server category filters and displays the corresponding results", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    server.use(
      getImmersionSessionHistoryMockHandler(({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const types = url.searchParams.getAll("type");
        const reading = types.includes("book");
        const watching = types.includes("anime");
        return {
          items: [reading ? sessions[0] : watching ? sessions[1] : sessions[0]],
          total: reading ? 2 : watching ? 3 : 5,
          page: Number(url.searchParams.get("page")),
          limit: 4,
        };
      }),
    );
    renderWithQuery(<History />);
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Watching" }));
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("An anime episode"),
    ).toBeVisible();
    expect(requests.at(-1)?.searchParams.getAll("type")).toEqual([
      "anime",
      "drama",
      "video",
    ]);
    expect(screen.getAllByText("Showing 1–3 of 3 entries")[0]).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Reading" }));
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
    expect(requests.at(-1)?.searchParams.getAll("type")).toEqual([
      "book",
      "manga",
    ]);
    expect(screen.getAllByText("Showing 1–2 of 2 entries")[0]).toBeVisible();
  });

  it("applies a selected UTC date range to the displayed history", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:30:00Z"));
    try {
      const user = userEvent.setup();
      const requests: URL[] = [];
      server.use(
        getImmersionSessionHistoryMockHandler(({ request }) => {
          const url = new URL(request.url);
          requests.push(url);
          const filtered =
            url.searchParams.get("start_date") === "2026-10-10" &&
            url.searchParams.get("end_date") === "2026-10-12";
          return {
            items: [filtered ? sessions[1] : sessions[0]],
            total: 1,
            page: 1,
            limit: 4,
          };
        }),
      );
      renderWithQuery(<History />);
      expect(
        await within(
          await screen.findByRole("table", { name: "Immersion history" }),
        ).findByText("A Japanese novel"),
      ).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Date range" }));
      await user.click(
        await screen.findByRole("button", { name: /October 10th, 2026/ }),
      );
      await user.click(
        screen.getByRole("button", { name: /October 12th, 2026/ }),
      );
      await user.click(screen.getByRole("button", { name: "Apply" }));
      expect(
        await within(
          await screen.findByRole("table", { name: "Immersion history" }),
        ).findByText("An anime episode"),
      ).toBeVisible();
      expect(requests.at(-1)?.searchParams.get("start_date")).toBe(
        "2026-10-10",
      );
      expect(requests.at(-1)?.searchParams.get("end_date")).toBe("2026-10-12");
    } finally {
      vi.useRealTimers();
    }
  });

  it("edits a session and refreshes its displayed duration", async () => {
    const user = userEvent.setup();
    let duration = 6300;
    let updateBody: unknown;
    server.use(
      getImmersionSessionHistoryMockHandler(() => ({
        items: [{ ...sessions[0], duration }],
        total: 1,
        page: 1,
        limit: 4,
      })),
      http.patch("*/immersion-session/:id", async ({ request, params }) => {
        expect(params.id).toBe("one");
        updateBody = await request.json();
        duration = 7200;
        return HttpResponse.json({ _id: "one" });
      }),
    );
    renderWithQuery(<History />);
    const table = await screen.findByRole("table", {
      name: "Immersion history",
    });
    expect(await within(table).findByText("01:45:00")).toBeVisible();
    await user.click(
      within(table).getByRole("button", { name: "Edit A Japanese novel" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Edit session" }),
    ).toBeVisible();
    await user.clear(screen.getByRole("spinbutton", { name: "Hours" }));
    await user.type(screen.getByRole("spinbutton", { name: "Hours" }), "2");
    await user.clear(screen.getByRole("spinbutton", { name: "Minutes" }));
    await user.type(screen.getByRole("spinbutton", { name: "Minutes" }), "0");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await within(table).findByText("02:00:00")).toBeVisible();
    expect(updateBody).toMatchObject({
      duration: 7200,
      created_at: "2026-10-20",
    });
  });

  it("deletes a session after confirmation and refreshes the list", async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      getImmersionSessionHistoryMockHandler(() => ({
        items: deleted ? [] : [sessions[0]],
        total: deleted ? 0 : 1,
        page: 1,
        limit: 4,
      })),
      http.delete("*/immersion-session/:id", ({ params }) => {
        expect(params.id).toBe("one");
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithQuery(<History />);
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
    await user.click(
      within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).getByRole("button", { name: "Delete A Japanese novel" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Delete this session?" }),
    ).toBeVisible();
    expect(deleted).toBe(false);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete session",
      }),
    );
    await waitFor(() => expect(deleted).toBe(true));
    expect(
      await screen.findByText(
        "No immersion sessions yet. Your sessions will appear here.",
      ),
    ).toBeVisible();
  });

  it("returns to the previous page after deleting its last session", async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      getImmersionSessionHistoryMockHandler(({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return {
          items: page === 2 ? (deleted ? [] : [sessions[1]]) : [sessions[0]],
          total: deleted ? 4 : 5,
          page,
          limit: 4,
        };
      }),
      http.delete("*/immersion-session/:id", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithQuery(<History />);
    await within(
      await screen.findByRole("table", { name: "Immersion history" }),
    ).findByText("A Japanese novel");
    await user.click(screen.getAllByRole("button", { name: "Next page" })[0]);
    const table = await screen.findByRole("table", {
      name: "Immersion history",
    });
    await within(table).findByText("An anime episode");
    await user.click(
      within(table).getByRole("button", { name: "Delete An anime episode" }),
    );
    await user.click(
      within(
        await screen.findByRole("dialog", { name: "Delete this session?" }),
      ).getByRole("button", { name: "Delete session" }),
    );
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
    expect(screen.getAllByText("Page 1 of 1")[0]).toBeVisible();
  });

  it("replaces history with the server error page and recovers on retry", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/immersion-session", () =>
        HttpResponse.json(
          { message: "Internal details" },
          {
            status: 503,
            headers: { "X-Request-ID": "history-503" },
          },
        ),
      ),
    );
    renderWithQuery(<History />);
    expect(
      await screen.findByRole("heading", { name: "Something went wrong" }),
    ).toBeVisible();
    expect(screen.getByText("503 · SERVER ERROR")).toBeVisible();
    expect(screen.getByText("history-503")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Immersion history" }),
    ).not.toBeInTheDocument();
    server.use(
      getImmersionSessionHistoryMockHandler({
        items: [sessions[0]],
        total: 1,
        page: 1,
        limit: 4,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
  });

  it("shows a recoverable query error", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/immersion-session", () =>
        HttpResponse.json({}, { status: 429 }),
      ),
    );
    renderWithQuery(<History />);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("Could not load history");
    server.use(
      getImmersionSessionHistoryMockHandler({
        items: [sessions[0]],
        total: 1,
        page: 1,
        limit: 4,
      }),
    );
    await user.click(within(error).getByRole("button", { name: "Try again" }));
    expect(
      await within(
        await screen.findByRole("table", { name: "Immersion history" }),
      ).findByText("A Japanese novel"),
    ).toBeVisible();
  });
});
