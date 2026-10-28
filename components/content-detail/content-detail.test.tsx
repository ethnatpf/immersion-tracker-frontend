import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { Toaster } from "@/components/shadcn/sonner";
import {
  getContentDetailsMockHandler,
  getContentUpdateMockHandler,
  getImmersionSessionCreateMockHandler,
  getImmersionSessionHistoryMockHandler,
} from "@/lib/api/generated/immersion.msw";
import type {
  ContentDetailsResponseDto,
  SessionHistoryItemResponseDto,
} from "@/lib/api/generated/models";
import { renderWithQuery } from "@/test/render";
import { server } from "@/test/server";
import { ContentDetail } from "./content-detail";

const details: ContentDetailsResponseDto = {
  id: "book-1",
  title: "A Japanese novel",
  type: "book",
  completed: false,
  totalTimeSpent: 45900,
  lastImmersionSession: {
    id: "session-1",
    created_at: "2026-10-24T15:00:00.000Z",
    duration: 3600,
    progress: { unit: "page", start: 45, end: 100 },
  },
};

const sessions: SessionHistoryItemResponseDto[] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: `session-${index + 1}`,
    content_id: "book-1",
    title: "A Japanese novel",
    type: "book",
    created_at: `2026-10-${24 - index}T15:00:00.000Z`,
    duration: 1800 + index * 600,
    progress: { unit: "page", start: 45 + index * 20, end: 64 + index * 25 },
  }),
);

describe("ContentDetail", () => {
  it("shows the content summary and filtered session records, with pagination", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    server.use(
      getContentDetailsMockHandler(details),
      getImmersionSessionHistoryMockHandler(({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        return {
          items: url.searchParams.get("page") === "2" ? [sessions[0]] : sessions,
          total: 6,
          page: Number(url.searchParams.get("page")),
          limit: 5,
        };
      }),
    );

    renderWithQuery(<ContentDetail contentId="book-1" />);

    expect(await screen.findByRole("heading", { name: "A Japanese novel" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "History" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back to history" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log new session" })).toBeVisible();
    expect(screen.getByText(/p\. 45–100/)).toBeVisible();
    expect(screen.getAllByText("12:45:00").length).toBeGreaterThan(0);
    expect(requests[0]?.searchParams.get("content")).toBe("book-1");
    expect(requests[0]?.searchParams.get("limit")).toBe("5");

    const table = await screen.findByRole("table", {
      name: "Immersion sessions for this content",
    });
    expect(within(table).getByText("Pages 45–64")).toBeVisible();
    for (const count of [19, 24, 29, 34, 39]) {
      expect(within(table).getByText(`${count} pages`)).toBeVisible();
    }
    const mobileList = screen.getByRole("list", {
      name: "Immersion sessions for this content",
    });
    const firstMobileSession = within(mobileList).getAllByRole("listitem")[0];
    expect(
      within(firstMobileSession).getByRole("button", {
        name: "Edit A Japanese novel",
      }),
    ).toBeVisible();
    expect(
      within(firstMobileSession).getByRole("button", {
        name: "Delete A Japanese novel",
      }),
    ).toBeVisible();
    expect(
      within(firstMobileSession).queryByRole("button", {
        name: "Actions for A Japanese novel",
      }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View older records" }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get("page")).toBe("2"));
    expect(screen.getByRole("button", { name: "View newer records" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "View newer records" }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get("page")).toBe("1"));
  });

  it("opens the session dialog and logs a new session for this content", async () => {
    const user = userEvent.setup();
    let createBody: unknown;
    let createdSession: SessionHistoryItemResponseDto | null = null;
    server.use(
      getContentDetailsMockHandler(() =>
        createdSession
          ? {
              ...details,
              totalTimeSpent: details.totalTimeSpent + createdSession.duration,
              lastImmersionSession: {
                id: createdSession.id,
                created_at: createdSession.created_at,
                duration: createdSession.duration,
                progress: createdSession.progress,
              },
            }
          : details,
      ),
      getImmersionSessionHistoryMockHandler(() => ({
        items: createdSession ? [createdSession] : [],
        total: createdSession ? 1 : 0,
        page: 1,
        limit: 5,
      })),
      getImmersionSessionCreateMockHandler(async ({ request }) => {
        const body = await request.json() as {
          content: string;
          created_at: string;
          duration: number;
          progress?: SessionHistoryItemResponseDto["progress"];
        };
        createBody = body;
        createdSession = {
          id: "new-session",
          content_id: body.content,
          title: details.title,
          type: details.type,
          created_at: `${body.created_at}T00:00:00.000Z`,
          duration: body.duration,
          progress: body.progress,
        };
        return {
          _id: "new-session",
          content: "book-1",
          language: "ja",
          content_type: "book",
          user_id: "reader",
          created_at: createdSession.created_at,
          duration: body.duration,
        };
      }),
    );
    renderWithQuery(<ContentDetail contentId="book-1" />);

    await user.click(await screen.findByRole("button", { name: "Log new session" }));
    const dialog = await screen.findByRole("dialog", { name: "Log new session" });
    expect(within(dialog).getByText("A Japanese novel")).toBeVisible();
    await user.type(within(dialog).getByRole("spinbutton", { name: "Minutes" }), "15");
    await user.click(within(dialog).getByRole("button", { name: "Log session" }));

    await waitFor(() =>
      expect(createBody).toMatchObject({ content: "book-1", duration: 900 }),
    );
    expect(createBody).not.toHaveProperty("progress");
    expect(screen.queryByRole("dialog", { name: "Log new session" })).not.toBeInTheDocument();
    expect(await screen.findByText("13:00:00")).toBeVisible();
    expect(
      await within(
        await screen.findByRole("table", {
          name: "Immersion sessions for this content",
        }),
      ).findByText("00:15:00"),
    ).toBeVisible();
  });

  it.each([
    { type: "anime" as const, minutes: 24 },
    { type: "drama" as const, minutes: 60 },
  ])(
    "uses the $type episode default and requires progress when logging from content detail",
    async ({ type, minutes }) => {
      const user = userEvent.setup();
      let createBody: unknown;
      server.use(
        getContentDetailsMockHandler({ ...details, type }),
        getImmersionSessionHistoryMockHandler({ items: [], total: 0, page: 1, limit: 5 }),
        getImmersionSessionCreateMockHandler(async ({ request }) => {
          createBody = await request.json();
          return {
            _id: "new-session",
            content: "book-1",
            language: "ja",
            content_type: type,
            user_id: "reader",
            created_at: "2026-10-28T00:00:00.000Z",
            duration: minutes * 60 * 5,
            progress: { unit: "episode", start: 1, end: 5 },
          };
        }),
      );
      renderWithQuery(<ContentDetail contentId="book-1" />);

      await user.click(await screen.findByRole("button", { name: "Log new session" }));
      const dialog = await screen.findByRole("dialog", { name: "Log new session" });
      expect(
        within(dialog).getByRole("spinbutton", { name: "Episode duration" }),
      ).toHaveValue(minutes);
      await user.click(within(dialog).getByRole("button", { name: "Log session" }));
      expect(
        await within(dialog).findByText(
          "Enter an episode number or range, such as 4 or 61–64.",
        ),
      ).toBeVisible();
      expect(createBody).toBeUndefined();

      await user.type(within(dialog).getByRole("textbox", { name: "Episodes watched" }), "1–5");
      await user.click(within(dialog).getByRole("button", { name: "Log session" }));
      await waitFor(() => expect(createBody).toMatchObject({
        content: "book-1",
        duration: minutes * 60 * 5,
        progress: { unit: "episode", start: 1, end: 5 },
      }));
      expect(screen.queryByRole("dialog", { name: "Log new session" })).not.toBeInTheDocument();
    },
  );

  it("toggles completion in both directions and refreshes the content details", async () => {
    const user = userEvent.setup();
    const updateBodies: unknown[] = [];
    let isCompleted = false;
    server.use(
      getContentDetailsMockHandler(() => ({ ...details, completed: isCompleted })),
      getImmersionSessionHistoryMockHandler({ items: [], total: 0, page: 1, limit: 5 }),
      getContentUpdateMockHandler(async ({ request }) => {
        const body = await request.json();
        updateBodies.push(body);
        isCompleted = Boolean((body as { completed: boolean }).completed);
        return { _id: details.id, title: details.title, type: details.type, user_id: "reader", language: "ja", completed: isCompleted };
      }),
    );

    renderWithQuery(
      <>
        <ContentDetail contentId="book-1" />
        <Toaster />
      </>,
    );
    await user.click(await screen.findByRole("button", { name: "Mark book as completed" }));

    await waitFor(() => expect(updateBodies).toEqual([{ completed: true }]));
    expect(await screen.findByText("Completed")).toBeVisible();
    expect(await screen.findByText("Content marked as completed")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Mark book as in progress" }));

    await waitFor(() =>
      expect(updateBodies).toEqual([{ completed: true }, { completed: false }]),
    );
    expect(await screen.findByText("In progress")).toBeVisible();
    expect(await screen.findByText("Content moved back to in progress")).toBeVisible();
  });

  it("shows an empty state when content has no immersion sessions", async () => {
    server.use(
      getContentDetailsMockHandler({ ...details, lastImmersionSession: null }),
      getImmersionSessionHistoryMockHandler({ items: [], total: 0, page: 1, limit: 5 }),
    );

    renderWithQuery(<ContentDetail contentId="book-1" />);

    expect(await screen.findByText("No sessions have been recorded for this content.")).toBeVisible();
    expect(screen.getByText("No immersion sessions yet")).toBeVisible();
  });

  it("counts episode progress ranges inclusively", async () => {
    const episode: SessionHistoryItemResponseDto = {
      id: "episode-session",
      content_id: "book-1",
      title: "A Japanese novel",
      type: "anime",
      created_at: "2026-10-24T15:00:00.000Z",
      duration: 1800,
      progress: { unit: "episode", start: 1, end: 5 },
    };
    server.use(
      getContentDetailsMockHandler({ ...details, type: "anime" }),
      getImmersionSessionHistoryMockHandler({
        items: [
          episode,
          {
            ...episode,
            id: "single-episode-session",
            progress: { unit: "episode", start: 4, end: 4 },
          },
        ],
        total: 2,
        page: 1,
        limit: 5,
      }),
    );

    renderWithQuery(<ContentDetail contentId="book-1" />);

    const table = await screen.findByRole("table", {
      name: "Immersion sessions for this content",
    });
    expect(within(table).getByText("Episodes 1–5")).toBeVisible();
    expect(within(table).getByText("5 episodes")).toBeVisible();
    expect(within(table).getByText("1 episode")).toBeVisible();
  });

  it("recovers from a content query error when retried", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get("*/api/backend/content/book-1", () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: "Content not found" }, { status: 404 })
          : HttpResponse.json(details);
      }),
      getImmersionSessionHistoryMockHandler({ items: [], total: 0, page: 1, limit: 5 }),
    );

    renderWithQuery(<ContentDetail contentId="book-1" />);
    expect(await screen.findByText("Could not load content details")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "A Japanese novel" })).toBeVisible();
    expect(attempts).toBe(2);
  });
});
