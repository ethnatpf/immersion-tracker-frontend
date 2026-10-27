"use client";

import { useId, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { DatePicker } from "@/components/shadcn/date-picker";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";
import type {
  SessionHistoryItemResponseDtoType,
  SessionProgressResponseDto,
} from "@/lib/api/generated/models";
import { sessionMediaStyles, SessionTypeIcon } from "@/components/session-media";
import { episodeDurationSeconds, episodeRange } from "@/lib/session-entry";

export type SessionDialogSubmission = {
  created_at: string;
  duration: number;
  progress?: SessionProgressResponseDto;
};

export type SessionDialogSession = {
  type: SessionHistoryItemResponseDtoType;
  title: string;
  created_at: string;
  duration: number;
  progress?: SessionProgressResponseDto;
};

const sessionSchema = z
  .object({
    date: z.string().refine(
      (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value &&
        value <= new Date().toISOString().slice(0, 10),
      "Choose a valid date no later than today (UTC).",
    ),
  });

const durationSchema = z
  .object({
    hours: z.string().regex(/^\d+$/, "Enter a whole number of hours."),
    minutes: z.string().regex(/^\d+$/, "Enter minutes from 0 to 59."),
    seconds: z.string().regex(/^\d+$/, "Enter seconds from 0 to 59."),
  })
  .superRefine((value, context) => {
    const hours = Number(value.hours);
    const minutes = Number(value.minutes);
    const seconds = Number(value.seconds);
    if (!Number.isSafeInteger(hours)) {
      context.addIssue({
        code: "custom",
        path: ["hours"],
        message: "Duration is too large.",
      });
    }
    if (minutes > 59) {
      context.addIssue({
        code: "custom",
        path: ["minutes"],
        message: "Enter minutes from 0 to 59.",
      });
    }
    if (seconds > 59) {
      context.addIssue({
        code: "custom",
        path: ["seconds"],
        message: "Enter seconds from 0 to 59.",
      });
    }
    const duration = hours * 3600 + minutes * 60 + seconds;
    if (!Number.isSafeInteger(duration)) {
      context.addIssue({
        code: "custom",
        path: ["hours"],
        message: "Duration is too large.",
      });
    } else if (duration < 1) {
      context.addIssue({
        code: "custom",
        path: ["seconds"],
        message: "Enter a positive duration.",
      });
    }
  });

type SessionValues = z.infer<typeof sessionSchema> & z.infer<typeof durationSchema>;

const episodeSchema = z
  .object({
    episodes: z.string(),
    episodeMinutes: z.string(),
    requireEpisodeProgress: z.boolean(),
  })
  .superRefine(({ episodes, episodeMinutes, requireEpisodeProgress }, context) => {
    if (!episodes.trim() && !episodeMinutes.trim() && !requireEpisodeProgress) return;
    const range = episodeRange(episodes);
    if (!range) {
      context.addIssue({
        code: "custom",
        path: ["episodes"],
        message: "Enter an episode number or range, such as 4 or 61–64.",
      });
    }
    const minutes = Number(episodeMinutes);
    if (
      !episodeMinutes.trim() ||
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      !Number.isSafeInteger(minutes * 60)
    ) {
      context.addIssue({
        code: "custom",
        path: ["episodeMinutes"],
        message: "Enter a positive episode duration precise to whole seconds.",
      });
    } else if (range && !episodeDurationSeconds(range, minutes)) {
      context.addIssue({
        code: "custom",
        path: ["episodeMinutes"],
        message: "The calculated duration is too large.",
      });
    }
  });

const pageSchema = z
  .object({ pageStart: z.string(), pageEnd: z.string() })
  .superRefine(({ pageStart, pageEnd }, context) => {
    if (!pageStart.trim() && !pageEnd.trim()) return;
    const start = Number(pageStart);
    const end = Number(pageEnd);
    if (!/^\d+$/.test(pageStart) || !Number.isSafeInteger(start) || start < 1) {
      context.addIssue({
        code: "custom",
        path: ["pageStart"],
        message: "Enter a positive starting page.",
      });
    }
    if (
      !/^\d+$/.test(pageEnd) ||
      !Number.isSafeInteger(end) ||
      end < start
    ) {
      context.addIssue({
        code: "custom",
        path: ["pageEnd"],
        message: "Enter an ending page at or after the starting page.",
      });
    }
  });

function initialValues(session: SessionDialogSession): SessionValues {
  const hours = Math.floor(session.duration / 3600);
  const minutes = Math.floor((session.duration % 3600) / 60);
  const seconds = session.duration % 60;
  return {
    date: session.created_at.slice(0, 10),
    hours: String(hours),
    minutes: String(minutes),
    seconds: String(seconds),
  };
}

export function SessionDialog({
  session,
  open,
  onOpenChange,
  title,
  saveLabel,
  requireEpisodeProgress = false,
  onSave,
}: {
  session: SessionDialogSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  saveLabel: string;
  requireEpisodeProgress?: boolean;
  onSave: (data: SessionDialogSubmission) => Promise<void>;
}) {
  const supportsEpisodes = session.type === "anime" || session.type === "drama";
  const supportsPages = session.type === "book" || session.type === "manga";
  const sessionProgress = session.progress;
  const id = useId().replaceAll(":", "");
  const [values, setValues] = useState(() => initialValues(session));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof SessionValues | "episodes" | "episodeMinutes" | "pageStart" | "pageEnd", string>>
  >({});
  const mediaStyle = sessionMediaStyles[session.type];
  const episodeRangeValue =
    sessionProgress?.unit === "episode"
      ? sessionProgress.start === sessionProgress.end
        ? String(sessionProgress.start)
        : `${sessionProgress.start}–${sessionProgress.end}`
      : "";
  const episodeMinutesValue =
    sessionProgress?.unit === "episode"
      ? String(
          session.duration /
            (sessionProgress.end - sessionProgress.start + 1) /
            60,
        )
      : "";
  const pageStartValue =
    sessionProgress?.unit === "page" ? String(sessionProgress.start) : "";
  const pageEndValue =
    sessionProgress?.unit === "page" ? String(sessionProgress.end) : "";

  function change<K extends keyof SessionValues>(key: K, value: SessionValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formData = new FormData(event.currentTarget);
    const episodes = String(formData.get("episodes") ?? "");
    const episodeMinutes = String(formData.get("episodeMinutes") ?? "");
    const pageStart = String(formData.get("pageStart") ?? "");
    const pageEnd = String(formData.get("pageEnd") ?? "");
    const result = sessionSchema.safeParse(values);
    const durationResult = supportsEpisodes
      ? undefined
      : durationSchema.safeParse(values);
    if (!result.success || (durationResult && !durationResult.success)) {
      const nextErrors: Partial<Record<keyof SessionValues, string>> = {};
      const issues = [
        ...(!result.success ? result.error.issues : []),
        ...(!durationResult?.success ? durationResult?.error.issues ?? [] : []),
      ];
      for (const issue of issues) {
        const key = issue.path[0] as keyof SessionValues;
        nextErrors[key] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    const episodeResult = episodeSchema.safeParse({
      episodes,
      episodeMinutes,
      requireEpisodeProgress,
    });
    const pageResult = pageSchema.safeParse({ pageStart, pageEnd });
    if (!episodeResult.success || !pageResult.success) {
      const nextErrors: typeof errors = {};
      for (const issue of [
        ...(!episodeResult.success ? episodeResult.error.issues : []),
        ...(!pageResult.success ? pageResult.error.issues : []),
      ]) {
        const key = issue.path[0] as keyof typeof errors;
        nextErrors[key] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    let duration =
      Number(values.hours) * 3600 +
      Number(values.minutes) * 60 +
      Number(values.seconds);
    const data: SessionDialogSubmission = {
      created_at: result.data.date,
      duration,
    };
    if (
      supportsEpisodes &&
      episodeResult.data.episodes.trim() &&
      episodeResult.data.episodeMinutes.trim()
    ) {
      const range = episodeRange(episodeResult.data.episodes)!;
      const episodeDuration = episodeDurationSeconds(
        range,
        Number(episodeResult.data.episodeMinutes),
      )!;
      duration = episodeDuration;
      data.duration = duration;
      data.progress = { unit: "episode", ...range };
    } else if (
      supportsPages &&
      pageResult.data.pageStart.trim() &&
      pageResult.data.pageEnd.trim()
    ) {
      data.progress = {
        unit: "page",
        start: Number(pageResult.data.pageStart),
        end: Number(pageResult.data.pageEnd),
      };
    }
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } catch {
      // Keep the dialog and draft open; the caller owns save-error feedback.
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[#182d2a]/35 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0"
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[600px] flex-col gap-0 overflow-hidden rounded-2xl bg-white p-0 text-foreground shadow-xl ring-0 sm:max-w-[600px]"
      >
          <header className="flex items-center gap-4 border-b border-border px-6 py-5">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                color: mediaStyle.color,
                backgroundColor: mediaStyle.background,
              }}
            >
              <SessionTypeIcon
                type={session.type}
                aria-hidden="true"
                className="size-5"
              />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
              <DialogDescription className="truncate text-sm text-muted-foreground">
                {session.title}
              </DialogDescription>
            </div>
            <DialogClose
              aria-label="Close session dialog"
              disabled={saving}
              render={<Button variant="ghost" size="icon" className="shrink-0" />}
            >
              <X aria-hidden="true" className="size-4" />
            </DialogClose>
          </header>
          <form
            onSubmit={(event) => void save(event)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <fieldset
              disabled={saving}
              className="grid gap-5 overflow-y-auto p-6 sm:grid-cols-2"
              aria-busy={saving}
            >
              <legend className="sr-only">Session details</legend>
              <div
                className={`space-y-2 ${supportsEpisodes ? "sm:col-span-1" : "sm:col-span-2"}`}
              >
                <label
                  className="block text-xs text-muted-foreground"
                  htmlFor={`session-dialog-date-${id}`}
                >
                  Date (UTC)
                </label>
                <DatePicker
                  id={`session-dialog-date-${id}`}
                  ariaLabel="Choose session date"
                  value={values.date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(value) => change("date", value)}
                  invalid={!!errors.date}
                  describedBy={
                    errors.date
                      ? `session-dialog-date-error-${id}`
                      : undefined
                  }
                />
                {errors.date && (
                  <p
                    id={`session-dialog-date-error-${id}`}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors.date}
                  </p>
                )}
              </div>
              {supportsEpisodes ? (
                <div
                  className="contents"
                  key={`episode-progress-${episodeRangeValue}-${episodeMinutesValue}`}
                >
                  <div className="space-y-2 sm:col-span-1">
                    <label
                      className="block text-xs text-muted-foreground"
                      htmlFor={`session-dialog-episodes-${id}`}
                    >
                      Episodes watched
                    </label>
                    <Input
                      id={`session-dialog-episodes-${id}`}
                      name="episodes"
                      aria-label="Episodes watched"
                      defaultValue={episodeRangeValue}
                      placeholder="e.g. 12–14"
                      aria-invalid={!!errors.episodes}
                      aria-describedby={
                        errors.episodes
                          ? `session-dialog-episodes-error-${id}`
                          : undefined
                      }
                      onChange={() => {
                        setErrors((previous) => ({
                          ...previous,
                          episodes: undefined,
                        }));
                      }}
                      className="h-12 rounded-[10px] bg-[#f9fbfa]"
                    />
                    {errors.episodes && (
                      <p
                        id={`session-dialog-episodes-error-${id}`}
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {errors.episodes}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label
                      className="block text-xs text-muted-foreground"
                      htmlFor={`session-dialog-episode-duration-${id}`}
                    >
                      Episode duration
                    </label>
                    <div className="relative">
                      <Input
                        id={`session-dialog-episode-duration-${id}`}
                        name="episodeMinutes"
                        aria-label="Episode duration"
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={episodeMinutesValue}
                        placeholder="24"
                        aria-invalid={!!errors.episodeMinutes}
                        aria-describedby={
                          errors.episodeMinutes
                            ? `session-dialog-episode-duration-error-${id}`
                            : undefined
                        }
                        onChange={() => {
                          setErrors((previous) => ({
                            ...previous,
                            episodeMinutes: undefined,
                          }));
                        }}
                        className="h-12 rounded-[10px] bg-[#f9fbfa] pr-12"
                      />
                      <span className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-muted-foreground">
                        min
                      </span>
                    </div>
                    {errors.episodeMinutes && (
                      <p
                        id={`session-dialog-episode-duration-error-${id}`}
                        role="alert"
                        className="text-xs text-destructive"
                      >
                        {errors.episodeMinutes}
                      </p>
                    )}
                  </div>
                </div>
              ) : supportsPages ? (
                <div
                  className="contents"
                  key={`page-progress-${pageStartValue}-${pageEndValue}`}
                >
                  <div className="space-y-2">
                    <label
                      className="block text-xs text-muted-foreground"
                      htmlFor={`session-dialog-page-start-${id}`}
                    >
                      Page from
                    </label>
                    <Input
                      id={`session-dialog-page-start-${id}`}
                      name="pageStart"
                      aria-label="Page from"
                      type="number"
                      min={1}
                      defaultValue={pageStartValue}
                      aria-invalid={!!errors.pageStart}
                      onChange={() => {
                        setErrors((previous) => ({
                          ...previous,
                          pageStart: undefined,
                        }));
                      }}
                      className="h-12 rounded-[10px] bg-[#f9fbfa]"
                    />
                    {errors.pageStart && (
                      <p role="alert" className="text-xs text-destructive">
                        {errors.pageStart}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label
                      className="block text-xs text-muted-foreground"
                      htmlFor={`session-dialog-page-end-${id}`}
                    >
                      Page to
                    </label>
                    <Input
                      id={`session-dialog-page-end-${id}`}
                      name="pageEnd"
                      aria-label="Page to"
                      type="number"
                      min={1}
                      defaultValue={pageEndValue}
                      aria-invalid={!!errors.pageEnd}
                      onChange={() => {
                        setErrors((previous) => ({
                          ...previous,
                          pageEnd: undefined,
                        }));
                      }}
                      className="h-12 rounded-[10px] bg-[#f9fbfa]"
                    />
                    {errors.pageEnd && (
                      <p role="alert" className="text-xs text-destructive">
                        {errors.pageEnd}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              {!supportsEpisodes && (
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      ["hours", "Hours", undefined],
                      ["minutes", "Minutes", 59],
                      ["seconds", "Seconds", 59],
                    ] as const).map(([key, label, max]) => (
                      <div key={key} className="space-y-2">
                        <label
                          htmlFor={`session-dialog-${key}-${id}`}
                          className="sr-only"
                        >
                          {label}
                        </label>
                        <Input
                          id={`session-dialog-${key}-${id}`}
                          aria-label={label}
                          type="number"
                          min={0}
                          max={max}
                          step={1}
                          value={values[key]}
                          onChange={(event) => change(key, event.target.value)}
                          aria-invalid={!!errors[key]}
                          aria-describedby={
                            errors[key]
                              ? `session-dialog-${key}-error-${id}`
                              : undefined
                          }
                          className="h-12 rounded-[10px] bg-[#f9fbfa]"
                        />
                        <p className="text-center text-[11px] text-muted-foreground">
                          {label}
                        </p>
                        {errors[key] && (
                          <p
                            id={`session-dialog-${key}-error-${id}`}
                            role="alert"
                            className="text-xs text-destructive"
                          >
                            {errors[key]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>
            <footer className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <DialogClose
                disabled={saving}
                render={<Button type="button" variant="outline" />}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : saveLabel}
              </Button>
            </footer>
          </form>
      </DialogContent>
    </Dialog>
  );
}
