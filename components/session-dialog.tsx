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
import { SessionProgressUnitSelect } from "@/components/session-progress-unit-select";
import type {
  SessionHistoryItemResponseDtoType,
  SessionProgressResponseDto,
} from "@/lib/api/generated/models";
import {
  sessionMediaStyles,
  SessionTypeIcon,
} from "@/components/session-media";
import {
  episodeDurationSeconds,
  episodeRange,
  isReading,
  supportsProgress as contentSupportsProgress,
  usesEpisodeProgress,
} from "@/lib/session-entry";
import { DEFAULT_EPISODE_MINUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ReadingProgressUnit } from "@/lib/session-progress";
import {
  dateTimeInputToTimestamp,
  getLocalDateInputValue,
  isLocalDateTimeInPastOrPresent,
  isValidLocalDateInput,
  isValidLocalDateTimeInput,
  isValidLocalTimeInput,
  timestampToDateInput,
  timestampToTimeInput,
} from "@/lib/date";

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
    date: z
      .string()
      .refine(
        (value) => isValidLocalDateInput(value),
        "Choose a valid date no later than today.",
      ),
    time: z.string().refine(isValidLocalTimeInput, "Choose a valid time."),
  })
  .superRefine(({ date, time }, context) => {
    if (isValidLocalDateInput(date) && isValidLocalTimeInput(time)) {
      if (!isValidLocalDateTimeInput(date, time)) {
        context.addIssue({
          code: "custom",
          path: ["time"],
          message: "This local time does not exist on the selected date.",
        });
      } else if (!isLocalDateTimeInPastOrPresent(date, time)) {
        context.addIssue({
          code: "custom",
          path: ["time"],
          message: "Choose a time that is not in the future.",
        });
      }
    }
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
        path: ["minutes"],
        message: "Enter a positive duration.",
      });
    }
  });

type SessionValues = z.infer<typeof sessionSchema> &
  z.infer<typeof durationSchema>;

const episodeSchema = z
  .object({
    episodes: z.string(),
    episodeMinutes: z.string(),
    requireEpisodeProgress: z.boolean(),
    requireEpisodeDuration: z.boolean(),
  })
  .superRefine(
    (
      {
        episodes,
        episodeMinutes,
        requireEpisodeProgress,
        requireEpisodeDuration,
      },
      context,
    ) => {
      if (!episodes.trim() && !requireEpisodeProgress) return;
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
        requireEpisodeDuration &&
        (!episodeMinutes.trim() ||
          !Number.isFinite(minutes) ||
          minutes <= 0 ||
          !Number.isSafeInteger(minutes * 60))
      ) {
        context.addIssue({
          code: "custom",
          path: ["episodeMinutes"],
          message:
            "Enter a positive episode duration precise to whole seconds.",
        });
      } else if (
        requireEpisodeDuration &&
        range &&
        !episodeDurationSeconds(range, minutes)
      ) {
        context.addIssue({
          code: "custom",
          path: ["episodeMinutes"],
          message: "The calculated duration is too large.",
        });
      }
    },
  );

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
        message: "Enter a positive starting value.",
      });
    }
    if (!/^\d+$/.test(pageEnd) || !Number.isSafeInteger(end) || end < start) {
      context.addIssue({
        code: "custom",
        path: ["pageEnd"],
        message: "Enter an ending value at or after the starting value.",
      });
    }
  });

function initialValues(session: SessionDialogSession): SessionValues {
  const hours = Math.floor(session.duration / 3600);
  const minutes = Math.floor((session.duration % 3600) / 60);
  const seconds = session.duration % 60;
  return {
    date: timestampToDateInput(session.created_at),
    time: timestampToTimeInput(session.created_at),
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
  const supportsEpisodes = usesEpisodeProgress(session.type);
  const supportsPages = isReading(session.type);
  const hasProgressUnit = supportsPages || session.type === "audiobook";
  const supportsProgress = contentSupportsProgress(session.type);
  const defaultEpisodeMinutes =
    session.type === "anime"
      ? DEFAULT_EPISODE_MINUTES.anime
      : session.type === "drama"
        ? DEFAULT_EPISODE_MINUTES.drama
        : undefined;
  const sessionProgress = session.progress;
  const needsEpisodeProgress =
    requireEpisodeProgress || sessionProgress?.unit === "episode";
  const id = useId().replaceAll(":", "");
  const [values, setValues] = useState(() => initialValues(session));
  const [manualDuration, setManualDuration] = useState(() =>
    !supportsEpisodes ||
    (!requireEpisodeProgress && sessionProgress?.auto !== true),
  );
  const [progressUnit, setProgressUnit] = useState<ReadingProgressUnit>(() =>
    session.type === "audiobook" || session.progress?.unit === "chapter"
      ? "chapter"
      : "page",
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<
    Partial<
      Record<
        | keyof SessionValues
        | "episodes"
        | "episodeMinutes"
        | "pageStart"
        | "pageEnd",
        string
      >
    >
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
      : defaultEpisodeMinutes === undefined
        ? ""
        : String(defaultEpisodeMinutes);
  const [episodeMinutesDraft, setEpisodeMinutesDraft] =
    useState(episodeMinutesValue);
  const pageStartValue = supportsProgress
    ? String(sessionProgress?.start ?? "")
    : "";
  const pageEndValue = supportsProgress
    ? String(sessionProgress?.end ?? "")
    : "";
  const [pageStartDraft, setPageStartDraft] = useState(pageStartValue);
  const [pageEndDraft, setPageEndDraft] = useState(pageEndValue);

  function change<K extends keyof SessionValues>(
    key: K,
    value: SessionValues[K],
  ) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "hours" || key === "minutes" ? { seconds: "0" } : {}),
    }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const formData = new FormData(event.currentTarget);
    const episodes = String(formData.get("episodes") ?? "");
    const episodeMinutes = episodeMinutesDraft;
    const pageStart = pageStartDraft;
    const pageEnd = pageEndDraft;
    const result = sessionSchema.safeParse(values);
    const durationResult = manualDuration
      ? durationSchema.safeParse(values)
      : undefined;
    if (!result.success || (durationResult && !durationResult.success)) {
      const nextErrors: Partial<Record<keyof SessionValues, string>> = {};
      const issues = [
        ...(!result.success ? result.error.issues : []),
        ...(!durationResult?.success
          ? (durationResult?.error.issues ?? [])
          : []),
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
      requireEpisodeProgress: needsEpisodeProgress,
      requireEpisodeDuration: supportsEpisodes && !manualDuration,
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
      created_at: dateTimeInputToTimestamp(result.data.date, result.data.time),
      duration,
    };
    if (supportsEpisodes && episodeResult.data.episodes.trim()) {
      const range = episodeRange(episodeResult.data.episodes)!;
      if (!manualDuration) {
        const episodeDuration = episodeDurationSeconds(
          range,
          Number(episodeResult.data.episodeMinutes),
        )!;
        duration = episodeDuration;
        data.duration = duration;
      }
      data.progress = { unit: "episode", ...range, auto: !manualDuration };
    } else if (
      supportsProgress &&
      pageResult.data.pageStart.trim() &&
      pageResult.data.pageEnd.trim()
    ) {
      data.progress = {
        unit: progressUnit,
        start: Number(pageResult.data.pageStart),
        end: Number(pageResult.data.pageEnd),
        auto: false,
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
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
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
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="block text-xs text-muted-foreground"
                  htmlFor={`session-dialog-date-${id}`}
                >
                  Date
                </label>
                <DatePicker
                  id={`session-dialog-date-${id}`}
                  ariaLabel="Choose session date"
                  value={values.date}
                  max={getLocalDateInputValue()}
                  onChange={(value) => change("date", value)}
                  invalid={!!errors.date}
                  describedBy={
                    errors.date ? `session-dialog-date-error-${id}` : undefined
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
              <div className="space-y-2">
                <label
                  className="block text-xs text-muted-foreground"
                  htmlFor={`session-dialog-time-${id}`}
                >
                  Time
                </label>
                <Input
                  id={`session-dialog-time-${id}`}
                  aria-label="Choose session time"
                  type="time"
                  step="1"
                  value={values.time}
                  onChange={(event) => change("time", event.target.value)}
                  aria-invalid={!!errors.time}
                  aria-describedby={
                    errors.time ? `session-dialog-time-error-${id}` : undefined
                  }
                  className="h-12 rounded-[10px] bg-[#f9fbfa]"
                />
                {errors.time && (
                  <p
                    id={`session-dialog-time-error-${id}`}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors.time}
                  </p>
                )}
              </div>
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
                    {session.type === "podcast"
                      ? "Episodes listened"
                      : "Episodes watched"}
                  </label>
                  <Input
                    id={`session-dialog-episodes-${id}`}
                    name="episodes"
                    aria-label={
                      session.type === "podcast"
                        ? "Episodes listened"
                        : "Episodes watched"
                    }
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
                <div
                  className={cn(
                    "space-y-2 sm:col-span-1",
                    manualDuration && "hidden",
                  )}
                >
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
                      value={episodeMinutesDraft}
                      placeholder={
                        session.type === "podcast" ? undefined : "24"
                      }
                      aria-invalid={!!errors.episodeMinutes}
                      aria-describedby={
                        errors.episodeMinutes
                          ? `session-dialog-episode-duration-error-${id}`
                          : undefined
                      }
                      onChange={(event) => {
                        setEpisodeMinutesDraft(event.target.value);
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
                <button
                  type="button"
                  className="text-left text-xs font-medium text-[#4f6f68] underline-offset-4 hover:text-primary hover:underline sm:col-span-2"
                  onClick={() => setManualDuration((current) => !current)}
                >
                  {manualDuration
                    ? "Use calculated time"
                    : "Enter time manually"}
                </button>
              </div>
            ) : supportsProgress ? (
              <div
                className={cn(
                  "grid gap-3 sm:col-span-2",
                  hasProgressUnit ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                <p className="col-span-full text-xs text-muted-foreground">
                  {progressUnit === "page" ? "Page range" : "Chapter range"}
                </p>
                <div className="space-y-2">
                  <label
                    className="block text-xs text-muted-foreground"
                    htmlFor={`session-dialog-page-start-${id}`}
                  >
                    From
                  </label>
                  <Input
                    id={`session-dialog-page-start-${id}`}
                    name="pageStart"
                    aria-label={
                      progressUnit === "page" ? "Page from" : "Chapter from"
                    }
                    type="number"
                    min={1}
                    value={pageStartDraft}
                    aria-invalid={!!errors.pageStart}
                    onChange={(event) => {
                      setPageStartDraft(event.target.value);
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
                    To
                  </label>
                  <Input
                    id={`session-dialog-page-end-${id}`}
                    name="pageEnd"
                    aria-label={
                      progressUnit === "page" ? "Page to" : "Chapter to"
                    }
                    type="number"
                    min={1}
                    value={pageEndDraft}
                    aria-invalid={!!errors.pageEnd}
                    onChange={(event) => {
                      setPageEndDraft(event.target.value);
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
                {hasProgressUnit && (
                  <div className="space-y-2">
                    <label
                      className="block text-xs text-muted-foreground"
                      htmlFor={`session-dialog-progress-unit-${id}`}
                    >
                      Unit
                    </label>
                    <SessionProgressUnitSelect
                      id={`session-dialog-progress-unit-${id}`}
                      value={progressUnit}
                      allowPages={supportsPages}
                      disabled={!supportsPages}
                      onValueChange={setProgressUnit}
                    />
                  </div>
                )}
              </div>
            ) : null}
            {manualDuration && (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Duration</p>
                <div className={cn("grid grid-cols-2 gap-3")}>
                  {(
                    [
                      ["hours", "Hours", undefined],
                      ["minutes", "Minutes", 59],
                    ] as const
                  ).map(([key, label, max]) => (
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
          <footer className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
            <DialogClose
              disabled={saving}
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-[108px]"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full sm:w-[196px]"
            >
              {saving ? "Saving…" : saveLabel}
            </Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
