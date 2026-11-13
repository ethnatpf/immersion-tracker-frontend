import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionDialog } from "@/components/session-dialog";
import { dateInputToTimestamp } from "@/lib/date";
import { renderWithQuery } from "@/test/render";

describe("session dialog", () => {
  it("uses the default episode duration for a new anime session", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "anime",
          title: "New anime",
          created_at: dateInputToTimestamp("2026-10-24"),
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
        created_at: dateInputToTimestamp("2026-10-24"),
        duration: 1440,
        progress: { unit: "episode", start: 12, end: 12 },
      }),
    );
  });

  it("lets anime sessions use manual duration while keeping episode progress", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "anime",
          title: "Existing anime",
          created_at: dateInputToTimestamp("2026-10-24"),
          duration: 2880,
          progress: { unit: "episode", start: 2, end: 3 },
        }}
        open
        onOpenChange={vi.fn()}
        title="Edit session"
        saveLabel="Save changes"
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Enter time manually" }));
    expect(screen.getByRole("textbox", { name: "Episodes watched" })).toHaveValue("2–3");
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveValue(0);
    await user.clear(screen.getByRole("spinbutton", { name: "Minutes" }));
    await user.type(screen.getByRole("spinbutton", { name: "Minutes" }), "50");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        created_at: dateInputToTimestamp("2026-10-24"),
        duration: 3000,
        progress: { unit: "episode", start: 2, end: 3 },
      }),
    );
  });

  it("clears hidden seconds when an edited duration changes hours or minutes", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "video",
          title: "Existing video",
          created_at: dateInputToTimestamp("2026-10-24"),
          duration: 6337,
        }}
        open
        onOpenChange={vi.fn()}
        title="Edit session"
        saveLabel="Save changes"
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveValue(1);
    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(45);
    expect(screen.queryByRole("spinbutton", { name: "Seconds" })).not.toBeInTheDocument();
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
    fireEvent.change(minutes, { target: { value: "46" } });
    expect(minutes).toHaveValue(46);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        created_at: dateInputToTimestamp("2026-10-24"),
        duration: 6360,
      }),
    );
  });

  it("preserves the calculated episode duration draft across mode switches", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "anime",
          title: "Existing anime",
          created_at: dateInputToTimestamp("2026-10-24"),
          duration: 2880,
          progress: { unit: "episode", start: 2, end: 3 },
        }}
        open
        onOpenChange={vi.fn()}
        title="Edit session"
        saveLabel="Save changes"
        onSave={onSave}
      />,
    );

    const episodeDuration = screen.getByRole("spinbutton", {
      name: "Episode duration",
    });
    fireEvent.change(episodeDuration, { target: { value: "30" } });
    await user.click(
      screen.getByRole("button", { name: "Enter time manually" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Use calculated time" }),
    );
    expect(
      screen.getByRole("spinbutton", { name: "Episode duration" }),
    ).toHaveValue(30);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        created_at: dateInputToTimestamp("2026-10-24"),
        duration: 3600,
        progress: { unit: "episode", start: 2, end: 3 },
      }),
    );
  });

  it("allows audiobook chapter progress with a manual duration", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "audiobook",
          title: "Audio book",
          created_at: dateInputToTimestamp("2026-10-24"),
          duration: 3600,
        }}
        open
        onOpenChange={vi.fn()}
        title="Log session"
        saveLabel="Save session"
        onSave={onSave}
      />,
    );

    await user.type(screen.getByRole("spinbutton", { name: "Chapter from" }), "4");
    await user.type(screen.getByRole("spinbutton", { name: "Chapter to" }), "6");
    await user.click(screen.getByRole("button", { name: "Save session" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        created_at: dateInputToTimestamp("2026-10-24"),
        duration: 3600,
        progress: { unit: "chapter", start: 4, end: 6 },
      }),
    );
  });

  it("switches book progress between pages and chapters without changing duration", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => {});
    renderWithQuery(
      <SessionDialog
        session={{
          type: "book",
          title: "Novel",
          created_at: dateInputToTimestamp("2026-10-24"),
          duration: 3600,
          progress: { unit: "page", start: 20, end: 30 },
        }}
        open
        onOpenChange={vi.fn()}
        title="Edit session"
        saveLabel="Save changes"
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page from" }), {
      target: { value: "21" },
    });
    await user.click(screen.getByRole("combobox", { name: "Progress unit" }));
    await user.click(await screen.findByRole("option", { name: "Chapters" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        created_at: dateInputToTimestamp("2026-10-24"),
        duration: 3600,
        progress: { unit: "chapter", start: 21, end: 30 },
      }),
    );
  });
});
