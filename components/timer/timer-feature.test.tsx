import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toast } from "sonner";
import { Toaster } from "@/components/shadcn/sonner";
import { renderWithQuery } from "@/test/render";
import { server } from "@/test/server";
import {
  TimerFeature,
  type TimerFeatureHandle,
  useTimerLauncher,
} from "./timer-feature";
import { getTimerCurrentQueryKey } from "@/lib/api/generated/immersion";
import {
  getContentCreateMockHandler,
  getContentSearchMockHandler,
  getLanguageListMockHandler,
  getUserPreferencesMockHandler,
} from "@/lib/api/generated/immersion.msw";

const running = {
  id: "timer-one",
  content_id: "content-one",
  title: "The Dispossessed",
  type: "book" as const,
  started_at: new Date(Date.now() - 90_000).toISOString(),
};
let active: typeof running | null;
let starts: unknown[];
let stops: number;
let rejectStop: boolean;
let rejectLookup: boolean;
let rejectStart: boolean;
let created: unknown[];

afterEach(() => toast.dismiss());

beforeEach(() => {
  active = null;
  starts = [];
  stops = 0;
  rejectStop = false;
  rejectLookup = false;
  rejectStart = false;
  created = [];
  server.use(
    http.get("*/timer", () =>
      rejectLookup
        ? HttpResponse.json({ message: "Forbidden" }, { status: 403 })
        : active
          ? HttpResponse.json(active)
          : HttpResponse.json({ message: "No active timer" }, { status: 404 }),
    ),
    http.post("*/timer/start", async ({ request }) => {
      const payload = (await request.json()) as { content: string };
      starts.push(payload);
      if (rejectStart) {
        active = running;
        return HttpResponse.json({ message: "Conflict" }, { status: 409 });
      }
      active = {
        ...running,
        content_id: payload.content,
        title: payload.content === "new-content" ? "New book" : running.title,
        started_at: new Date().toISOString(),
      };
      return HttpResponse.json({
        _id: running.id,
        content: payload.content,
        user_id: "reader",
        started_at: active.started_at,
      });
    }),
    http.post("*/timer/stop", () => {
      stops += 1;
      if (rejectStop)
        return HttpResponse.json(
          { message: "Could not stop the timer." },
          { status: 400 },
        );
      active = null;
      return HttpResponse.json({
        _id: "session-one",
        content: running.content_id,
        language: "language-ja",
        content_type: "book",
        user_id: "reader",
        created_at: new Date().toISOString(),
        duration: 90,
      });
    }),
    getLanguageListMockHandler([
      { id: "language-ja", code: "ja", name: "Japanese", nativeName: "日本語" },
    ]),
    getUserPreferencesMockHandler({ preferred_language: "language-ja" }),
    getContentSearchMockHandler({
      items: [{ id: running.content_id, title: running.title, type: "book" }],
      total: 1,
      page: 1,
      limit: 20,
    }),
    getContentCreateMockHandler(async ({ request }) => {
      created.push(await request.json());
      return {
        _id: "new-content",
        title: "New book",
        type: "book",
        language: "language-ja",
        completed: false,
        user_id: "reader",
      };
    }),
  );
});

function renderFeature() {
  const ref = createRef<TimerFeatureHandle>();
  function PresetButton() {
    const launch = useTimerLauncher();
    return (
      <button
        onClick={() =>
          launch?.({
            id: running.content_id,
            title: running.title,
            type: running.type,
          })
        }
      >
        Start selected content
      </button>
    );
  }
  function ImmediatePresetButton() {
    const launch = useTimerLauncher();
    return (
      <button
        onClick={() =>
          launch?.(
            {
              id: running.content_id,
              title: running.title,
              type: running.type,
            },
            { immediate: true },
          )
        }
      >
        Start selected content immediately
      </button>
    );
  }
  function Harness() {
    const [reduced, setReduced] = useState(false);
    const client = useQueryClient();
    return (
      <>
        <button onClick={() => ref.current?.start()}>
          Start timer in sidebar
        </button>
        <button
          onClick={() => {
            active = null;
            void client.invalidateQueries({
              queryKey: getTimerCurrentQueryKey(),
            });
          }}
        >
          End active timer elsewhere
        </button>
        <TimerFeature ref={ref} reduced={reduced} onReducedChange={setReduced}>
          <PresetButton />
          <ImmediatePresetButton />
        </TimerFeature>
        <Toaster />
      </>
    );
  }
  return renderWithQuery(<Harness />);
}

async function chooseJapanese(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
) {
  await user.click(within(dialog).getByRole("combobox", { name: "Language" }));
  await user.click(await screen.findByRole("option", { name: /Japanese/ }));
}

describe("timer feature", () => {
  it("opens the timer chooser with the selected content preset", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start selected content" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    expect(
      within(dialog).getByRole("button", { name: "Book" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(dialog).getByText("Using the selected content."),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("combobox", { name: "Title / search" }),
    ).toHaveValue("The Dispossessed");
    await user.click(
      within(dialog).getByRole("button", { name: "Start timer" }),
    );

    await waitFor(() =>
      expect(starts).toEqual([{ content: running.content_id }]),
    );
    await user.click(
      screen.getByRole("button", { name: "End active timer elsewhere" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const genericDialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    expect(
      await within(genericDialog).findByRole("combobox", { name: "Language" }),
    ).toBeVisible();
    expect(
      within(genericDialog).getByRole("combobox", { name: "Title / search" }),
    ).toHaveValue("");
  });

  it("starts selected content immediately without opening the chooser", async () => {
    const user = userEvent.setup();
    renderFeature();

    await user.click(
      screen.getByRole("button", {
        name: "Start selected content immediately",
      }),
    );

    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(within(panel).getByText(running.title)).toBeVisible();
    expect(starts).toEqual([{ content: running.content_id }]);
    expect(
      screen.queryByRole("dialog", { name: "Start an immersion timer" }),
    ).not.toBeInTheDocument();
  });

  it("loads language choices when leaving a content preset", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start selected content" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    expect(
      within(dialog).queryByRole("combobox", { name: "Language" }),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Anime" }));
    const language = await within(dialog).findByRole("combobox", {
      name: "Language",
    });
    await user.click(language);
    expect(
      await screen.findByRole("option", { name: /Japanese/ }),
    ).toBeVisible();
  });

  it("defaults the language to the saved user preference", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    const language = await within(dialog).findByRole("combobox", {
      name: "Language",
    });
    await waitFor(() =>
      expect(language).toHaveTextContent("Japanese (日本語)"),
    );
    const title = await within(dialog).findByRole("combobox", {
      name: "Title / search",
    });
    expect(title).toBeEnabled();
  });

  it("leaves language unselected when the user has no saved preference", async () => {
    server.use(getUserPreferencesMockHandler({ preferred_language: null }));
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    const language = await within(dialog).findByRole("combobox", {
      name: "Language",
    });
    await waitFor(() =>
      expect(language).toHaveTextContent("Choose a language"),
    );
    expect(
      within(dialog).getByRole("combobox", { name: "Title / search" }),
    ).toBeDisabled();

    await chooseJapanese(user, dialog);

    expect(language).toHaveTextContent("Japanese (日本語)");
    expect(
      within(dialog).getByRole("combobox", { name: "Title / search" }),
    ).toBeEnabled();
  });

  it("shows preference lookup errors and applies the preference after retry", async () => {
    let requests = 0;
    server.use(
      http.get("*/user/preferences", () => {
        requests += 1;
        return requests === 1
          ? HttpResponse.json({ message: "Unavailable" }, { status: 403 })
          : HttpResponse.json({ preferred_language: "language-ja" });
      }),
    );
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    expect(
      await within(dialog).findByText("Could not load your preferred language"),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(
        within(dialog).getByRole("combobox", { name: "Language" }),
      ).toHaveTextContent("Japanese (日本語)"),
    );
  });

  it("clears the previous content selection and searches in the newly selected language", async () => {
    const searchLanguages: string[] = [];
    server.use(
      getLanguageListMockHandler([
        {
          id: "language-ja",
          code: "ja",
          name: "Japanese",
          nativeName: "日本語",
        },
        {
          id: "language-fr",
          code: "fr",
          name: "French",
          nativeName: "français",
        },
      ]),
      getContentSearchMockHandler(({ request }) => {
        const language =
          new URL(request.url).searchParams.get("language") ?? "";
        searchLanguages.push(language);
        return {
          items: [
            {
              id:
                language === "language-ja" ? "japanese-title" : "french-title",
              title:
                language === "language-ja"
                  ? "Japanese result"
                  : "French result",
              type: "book",
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        };
      }),
    );
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    await chooseJapanese(user, dialog);
    const title = within(dialog).getByRole("combobox", {
      name: "Title / search",
    });
    await user.type(title, "shared title");
    await user.click(
      await screen.findByRole("option", { name: "Japanese result" }),
    );
    expect(
      within(dialog).getByText("Existing content selected."),
    ).toBeVisible();

    await user.click(
      within(dialog).getByRole("combobox", { name: "Language" }),
    );
    await user.click(await screen.findByRole("option", { name: "French" }));

    expect(title).toHaveValue("");
    expect(
      within(dialog).getByText(
        "Search for an existing title, or choose a new one to create content.",
      ),
    ).toBeVisible();
    await user.type(title, "shared title");
    expect(
      await screen.findByRole("option", { name: "French result" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Japanese result" }),
    ).not.toBeInTheDocument();
    expect(searchLanguages).toContain("language-ja");
    expect(searchLanguages).toContain("language-fr");
  });

  it("hides the counter in the reduced timer and restores it when expanded", async () => {
    active = running;
    const user = userEvent.setup();
    renderFeature();
    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(within(panel).getByText(running.title)).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Finish & log" }),
    ).toBeVisible();
    expect(within(panel).getByLabelText("Elapsed time")).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Reduce active timer" }),
    );

    expect(
      within(panel).queryByLabelText("Elapsed time"),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Finish & log" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Expand active timer" }),
    ).toHaveFocus();

    await user.click(
      within(panel).getByRole("button", { name: "Expand active timer" }),
    );

    expect(within(panel).getByText(running.title)).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Finish & log" }),
    ).toBeVisible();
    expect(within(panel).getByLabelText("Elapsed time")).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Reduce active timer" }),
    ).toHaveFocus();
  });

  it("restores a running timer on page load and blocks a second start", async () => {
    active = running;
    const user = userEvent.setup();
    renderFeature();
    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(within(panel).getByText(running.title)).toBeVisible();
    expect(within(panel).getByLabelText("Elapsed time")).toHaveTextContent(
      /^00:01:/,
    );
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    expect(
      await screen.findByText("Stop the existing timer first."),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(starts).toHaveLength(0);
  });

  it("starts selected content, keeps one active timer, and logs it on stop", async () => {
    const user = userEvent.setup();
    renderFeature();
    await screen.findByRole("button", { name: "Start timer in sidebar" });
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    await chooseJapanese(user, dialog);
    const input = await within(dialog).findByRole("combobox", {
      name: "Title / search",
    });
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, "The Dispossessed");
    await user.click(
      await screen.findByRole("option", { name: "The Dispossessed" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Start timer" }),
    );
    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(within(panel).getByText(running.title)).toBeVisible();
    expect(starts).toEqual([{ content: running.content_id }]);
    await user.click(
      within(panel).getByRole("button", { name: "Reduce active timer" }),
    );
    await user.click(
      within(panel).getByRole("button", { name: "Expand active timer" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    expect(
      await screen.findByText("Stop the existing timer first."),
    ).toBeVisible();
    await user.click(
      within(panel).getByRole("button", { name: "Finish & log" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Active immersion timer" }),
      ).not.toBeInTheDocument(),
    );
    expect(stops).toBe(1);

    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const restartDialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    await chooseJapanese(user, restartDialog);
    const restartInput = await within(restartDialog).findByRole("combobox", {
      name: "Title / search",
    });
    await waitFor(() => expect(restartInput).toBeEnabled());
    await user.type(restartInput, "The Dispossessed");
    await user.click(
      await screen.findByRole("option", { name: "The Dispossessed" }),
    );
    await user.click(
      within(restartDialog).getByRole("button", { name: "Start timer" }),
    );
    const restartedPanel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(
      within(restartedPanel).getByRole("button", {
        name: "Reduce active timer",
      }),
    ).toBeVisible();
    expect(
      within(restartedPanel).queryByRole("button", {
        name: "Expand active timer",
      }),
    ).not.toBeInTheDocument();
    expect(starts).toHaveLength(2);
  });

  it("starts a later timer expanded after a reduced timer ends elsewhere", async () => {
    active = running;
    const user = userEvent.setup();
    renderFeature();
    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    await user.click(
      within(panel).getByRole("button", { name: "Reduce active timer" }),
    );
    expect(
      within(panel).getByRole("button", { name: "Expand active timer" }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "End active timer elsewhere" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Active immersion timer" }),
      ).not.toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    await chooseJapanese(user, dialog);
    const input = await within(dialog).findByRole("combobox", {
      name: "Title / search",
    });
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, "The Dispossessed");
    await user.click(
      await screen.findByRole("option", { name: "The Dispossessed" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Start timer" }),
    );
    const restartedPanel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(
      within(restartedPanel).getByRole("button", {
        name: "Reduce active timer",
      }),
    ).toBeVisible();
    expect(
      within(restartedPanel).queryByRole("button", {
        name: "Expand active timer",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps the timer visible after a failed stop and lets the user retry", async () => {
    active = running;
    rejectStop = true;
    const user = userEvent.setup();
    renderFeature();
    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    await user.click(
      within(panel).getByRole("button", { name: "Finish & log" }),
    );
    expect(await screen.findByText("Could not stop the timer.")).toBeVisible();
    expect(within(panel).getByText(running.title)).toBeVisible();
    rejectStop = false;
    await user.click(
      within(panel).getByRole("button", { name: "Finish & log" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Active immersion timer" }),
      ).not.toBeInTheDocument(),
    );
    expect(stops).toBe(2);
  });

  it("shows a recoverable lookup error and restores an existing timer", async () => {
    rejectLookup = true;
    active = running;
    const user = userEvent.setup();
    renderFeature();
    expect(await screen.findByText("Could not check your timer")).toBeVisible();
    rejectLookup = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("region", { name: "Active immersion timer" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Could not check your timer"),
    ).not.toBeInTheDocument();
  });

  it("removes a timer stopped elsewhere when the current timer lookup refreshes", async () => {
    active = running;
    const user = userEvent.setup();
    const { queryClient } = renderFeature();
    expect(
      await screen.findByRole("region", { name: "Active immersion timer" }),
    ).toBeVisible();
    active = null;
    await queryClient.invalidateQueries({
      queryKey: getTimerCurrentQueryKey(),
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Active immersion timer" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Start an immersion timer" }),
    ).toBeVisible();
  });

  it("creates a new title before starting its timer", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    await chooseJapanese(user, dialog);
    const input = await within(dialog).findByRole("combobox", {
      name: "Title / search",
    });
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, "New book");
    await user.click(
      await screen.findByRole("option", {
        name: "Create new content: New book",
      }),
    );
    expect(
      within(dialog).getByText(
        "Your new content will be created when you start the timer.",
      ),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Start timer" }),
    );
    const panel = await screen.findByRole("region", {
      name: "Active immersion timer",
    });
    expect(within(panel).getByText("New book")).toBeVisible();
    expect(created).toEqual([
      { title: "New book", type: "book", language: "language-ja" },
    ]);
    expect(starts).toEqual([{ content: "new-content" }]);
  });

  it("handles a Start click while the initial timer lookup is still loading", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("*/timer", async () => {
        await gate;
        return HttpResponse.json(
          { message: "No active timer" },
          { status: 404 },
        );
      }),
    );
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    release();
    expect(
      await screen.findByRole("dialog", { name: "Start an immersion timer" }),
    ).toBeVisible();
  });

  it("closes the dialog and shows the stop-first toast when another tab starts first", async () => {
    rejectStart = true;
    const user = userEvent.setup();
    renderFeature();
    await user.click(
      screen.getByRole("button", { name: "Start timer in sidebar" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Start an immersion timer",
    });
    await chooseJapanese(user, dialog);
    const input = await within(dialog).findByRole("combobox", {
      name: "Title / search",
    });
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, "The Dispossessed");
    await user.click(
      await screen.findByRole("option", { name: "The Dispossessed" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Start timer" }),
    );
    expect(
      await screen.findByRole("region", { name: "Active immersion timer" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText("Stop the existing timer first."),
    ).toBeVisible();
    expect(screen.queryByText("Conflict")).not.toBeInTheDocument();
    expect(screen.getAllByText("Stop the existing timer first.")).toHaveLength(
      1,
    );
  });
});
