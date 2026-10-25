import { describe, expect, it } from "vitest";
import {
  episodeRange,
  sessionPayload,
  type SessionEntry,
} from "./session-entry";

export const entry: SessionEntry = {
  type: "anime",
  language: "language-ja",
  title: "A title",
  url: "",
  date: "2026-01-01",
  episodes: "61–64",
  episodeMinutes: "24",
  hours: "0",
  minutes: "0",
  pageStart: "",
  pageEnd: "",
};

describe("session entry", () => {
  it("logs video viewing time without episode or page progress", () => {
    expect(
      sessionPayload(
        {
          ...entry,
          type: "video",
          hours: "0",
          minutes: "35",
          episodes: "",
          episodeMinutes: "",
          pageStart: "100",
          pageEnd: "2",
        },
        "lecture",
      ),
    ).toEqual({ content: "lecture", created_at: "2026-01-01", duration: 2100 });
  });
  it("treats a single episode number as that episode only", () => {
    expect(episodeRange("4")).toEqual({ start: 4, end: 4 });
    expect(
      sessionPayload({ ...entry, episodes: "4" }, "existing"),
    ).toMatchObject({
      duration: 1440,
      progress: { unit: "episode", start: 4, end: 4 },
    });
  });
  it("calculates inclusive ranges with hyphens or en dashes", () => {
    expect(sessionPayload(entry, "existing")).toEqual({
      content: "existing",
      created_at: "2026-01-01",
      duration: 5760,
      progress: { unit: "episode", start: 61, end: 64 },
    });
    expect(episodeRange(" 61 - 64 ")).toEqual({ start: 61, end: 64 });
  });
  it.each(["0", "-1", "5-2", "1.5", "1-2-3", "", "9007199254740992"])(
    "rejects invalid episode input %s",
    (episodes) => {
      expect(() =>
        sessionPayload({ ...entry, episodes }, "existing"),
      ).toThrow();
    },
  );
  it("logs reading time with optional page bounds", () => {
    const reading = {
      ...entry,
      type: "book" as const,
      hours: "1",
      minutes: "15",
    };
    expect(sessionPayload(reading, "novel")).toEqual({
      content: "novel",
      created_at: "2026-01-01",
      duration: 4500,
    });
    expect(
      sessionPayload({ ...reading, pageStart: "156", pageEnd: "188" }, "novel")
        .progress,
    ).toEqual({ unit: "page", start: 156, end: 188 });
  });
  it.each([
    { hours: "0", minutes: "0" },
    { minutes: "60" },
    { hours: "-1" },
    { pageStart: "5" },
    { pageStart: "8", pageEnd: "4" },
    { url: "javascript:alert(1)" },
    { date: "2026-02-30" },
    { date: "2999-01-01" },
    { title: " " },
  ])("rejects invalid reading entries %j", (changes) => {
    expect(() =>
      sessionPayload(
        { ...entry, type: "manga", hours: "1", minutes: "0", ...changes },
        "manga",
      ),
    ).toThrow();
  });
});
