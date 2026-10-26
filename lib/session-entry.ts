import type {
  CreateImmersionSessionDto,
  CreateContentDtoType,
} from "@/lib/api/generated/models";
import { z } from "zod";
import { isUnsignedIntegerInRange } from "@/lib/number";

export type SessionEntry = {
  type: CreateContentDtoType;
  language: string;
  title: string;
  url: string;
  date: string;
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

export function usesManualDuration(type: CreateContentDtoType) {
  return isReading(type) || type === "video";
}

export const sessionEntrySchema = z
  .object({
    type: z.enum(["anime", "book", "manga", "drama", "video"]),
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
        (value) =>
          /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value &&
          value <= new Date().toISOString().slice(0, 10),
        "Choose a valid date no later than today (UTC).",
      ),
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
    if (usesManualDuration(entry.type)) {
      if (!isUnsignedIntegerInRange(entry.hours, 0))
        issue("hours", "Enter a whole number of hours, zero or more.");
      if (!isUnsignedIntegerInRange(entry.minutes, 0, 59))
        issue("minutes", "Enter minutes from 0 to 59.");
      const seconds = Number(entry.hours) * 3600 + Number(entry.minutes) * 60;
      if (!Number.isSafeInteger(seconds) || seconds <= 0)
        issue("minutes", "Enter a positive duration.");
      if (isReading(entry.type) && (entry.pageStart || entry.pageEnd)) {
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
    } else {
      const range = episodeRange(entry.episodes);
      if (!range)
        issue(
          "episodes",
          "Enter an episode number or range, such as 4 or 61–64.",
        );
      const duration = Number(entry.episodeMinutes);
      if (
        !entry.episodeMinutes.trim() ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        !Number.isSafeInteger(duration * 60)
      )
        issue(
          "episodeMinutes",
          "Enter a positive duration in minutes, precise to whole seconds.",
        );
      else if (
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
  if (usesManualDuration(data.type)) {
    return {
      content,
      created_at: data.date,
      duration: Number(data.hours) * 3600 + Number(data.minutes) * 60,
      ...(isReading(data.type) && data.pageStart && data.pageEnd
        ? {
            progress: {
              unit: "page" as const,
              start: Number(data.pageStart),
              end: Number(data.pageEnd),
            },
          }
        : {}),
    };
  }
  const range = episodeRange(data.episodes)!;
  const duration = episodeDurationSeconds(range, Number(data.episodeMinutes))!;
  return {
    content,
    created_at: data.date,
    duration,
    progress: { unit: "episode", ...range },
  };
}
