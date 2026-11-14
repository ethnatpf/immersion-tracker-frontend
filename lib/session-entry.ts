import type {
  CreateImmersionSessionDto,
  CreateContentDtoType,
  SessionProgressDto,
} from "@/lib/api/generated/models";
import { CreateContentDtoType as ContentType } from "@/lib/api/generated/models";
import { z } from "zod";
import { isUnsignedIntegerInRange } from "@/lib/number";
import type { ReadingProgressUnit } from "@/lib/session-progress";
import {
  dateTimeInputToTimestamp,
  isLocalDateTimeInPastOrPresent,
  isValidLocalDateInput,
  isValidLocalDateTimeInput,
  isValidLocalTimeInput,
} from "@/lib/date";

export type SessionEntry = {
  type: CreateContentDtoType;
  durationMode: "calculated" | "manual";
  progressUnit: ReadingProgressUnit;
  language: string;
  title: string;
  url: string;
  date: string;
  time: string;
  episodes: string;
  episodeMinutes: string;
  hours: string;
  minutes: string;
  pageStart: string;
  pageEnd: string;
};

export function episodeRange(
  value: string,
): { start: number; end: number } | undefined {
  const match = /^\s*(\d+)\s*(?:[-–]\s*(\d+)\s*)?$/.exec(value);
  if (!match) return;
  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 1 ||
    end < start
  )
    return;
  return { start, end };
}

export function episodeDurationSeconds(
  range: { start: number; end: number },
  episodeMinutes: number,
): number | undefined {
  const secondsPerEpisode = episodeMinutes * 60;
  const totalSeconds = (range.end - range.start + 1) * secondsPerEpisode;
  return Number.isSafeInteger(secondsPerEpisode) &&
    secondsPerEpisode > 0 &&
    Number.isSafeInteger(totalSeconds) &&
    totalSeconds > 0
    ? totalSeconds
    : undefined;
}

export function isReading(type: CreateContentDtoType) {
  return type === "book" || type === "manga";
}

export function usesEpisodeProgress(type: CreateContentDtoType) {
  return type === "anime" || type === "drama" || type === "podcast";
}

export function usesManualDuration(type: CreateContentDtoType) {
  return !usesEpisodeProgress(type);
}

export function supportsProgress(type: CreateContentDtoType) {
  return (
    usesEpisodeProgress(type) ||
    type === "book" ||
    type === "manga" ||
    type === "audiobook"
  );
}

export const sessionEntrySchema = z
  .object({
    type: z.enum(ContentType),
    durationMode: z.enum(["calculated", "manual"]),
    progressUnit: z.enum(["page", "chapter"]),
    language: z.string().min(1, "Choose a language."),
    title: z
      .string()
      .trim()
      .min(1, "Enter a title.")
      .max(350, "Use at most 350 characters."),
    url: z
      .string()
      .trim()
      .refine(
        (value) =>
          !value || z.url({ protocol: /^https?$/ }).safeParse(value).success,
        "Enter a valid HTTP or HTTPS link.",
      ),
    date: z
      .string()
      .refine(
        (value) => isValidLocalDateInput(value),
        "Choose a valid date no later than today.",
      ),
    time: z.string().refine(isValidLocalTimeInput, "Choose a valid time."),
    episodes: z.string(),
    episodeMinutes: z.string(),
    hours: z.string(),
    minutes: z.string(),
    pageStart: z.string(),
    pageEnd: z.string(),
  })
  .superRefine((entry, ctx) => {
    const issue = (path: keyof SessionEntry, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (isValidLocalDateInput(entry.date) && isValidLocalTimeInput(entry.time)) {
      if (!isValidLocalDateTimeInput(entry.date, entry.time)) {
        issue("time", "This local time does not exist on the selected date.");
      } else if (!isLocalDateTimeInPastOrPresent(entry.date, entry.time)) {
        issue("time", "Choose a time that is not in the future.");
      }
    }
    const manualDuration =
      usesManualDuration(entry.type) || entry.durationMode === "manual";
    if (manualDuration) {
      if (!isUnsignedIntegerInRange(entry.hours, 0))
        issue("hours", "Enter a whole number of hours, zero or more.");
      if (!isUnsignedIntegerInRange(entry.minutes, 0, 59))
        issue("minutes", "Enter minutes from 0 to 59.");
      const seconds = Number(entry.hours) * 3600 + Number(entry.minutes) * 60;
      if (!Number.isSafeInteger(seconds) || seconds <= 0)
        issue("minutes", "Enter a positive duration.");
      if (supportsProgress(entry.type) && (entry.pageStart || entry.pageEnd)) {
        if (!isUnsignedIntegerInRange(entry.pageStart, 1))
          issue("pageStart", "Enter a positive starting page.");
        if (
          !isUnsignedIntegerInRange(entry.pageEnd, 1) ||
          Number(entry.pageEnd) < Number(entry.pageStart)
        )
          issue(
            "pageEnd",
            "Enter an ending page at or after the starting page.",
          );
      }
    }
    if (usesEpisodeProgress(entry.type)) {
      const range = episodeRange(entry.episodes);
      if ((!range && !manualDuration) || (entry.episodes.trim() && !range))
        issue(
          "episodes",
          "Enter an episode number or range, such as 4 or 61–64.",
        );
      const duration = Number(entry.episodeMinutes);
      if (
        !manualDuration &&
        (!entry.episodeMinutes.trim() ||
          !Number.isFinite(duration) ||
          duration <= 0 ||
          !Number.isSafeInteger(duration * 60))
      )
        issue(
          "episodeMinutes",
          "Enter a positive duration in minutes, precise to whole seconds.",
        );
      else if (
        !manualDuration &&
        range &&
        !Number.isSafeInteger((range.end - range.start + 1) * duration * 60)
      )
        issue("episodeMinutes", "The calculated duration is too large.");
    }
  });

export function sessionPayload(
  entry: SessionEntry,
  content: string,
): CreateImmersionSessionDto {
  const data = sessionEntrySchema.parse(entry);
  const manualDuration =
    usesManualDuration(data.type) || data.durationMode === "manual";
  const progressRange = usesEpisodeProgress(data.type)
    ? episodeRange(data.episodes)
    : undefined;
  if (manualDuration) {
    const progress: SessionProgressDto | undefined = progressRange
      ? { unit: "episode", ...progressRange, auto: false }
      : supportsProgress(data.type) && data.pageStart && data.pageEnd
        ? {
            unit: data.progressUnit,
            start: Number(data.pageStart),
            end: Number(data.pageEnd),
            auto: false,
          }
        : undefined;
    return {
      content,
      created_at: dateTimeInputToTimestamp(data.date, data.time),
      duration: Number(data.hours) * 3600 + Number(data.minutes) * 60,
      ...(progress ? { progress } : {}),
    };
  }
  const range = progressRange!;
  const duration = episodeDurationSeconds(range, Number(data.episodeMinutes))!;
  return {
    content,
    created_at: dateTimeInputToTimestamp(data.date, data.time),
    duration,
    progress: { unit: "episode", ...range, auto: true },
  };
}
