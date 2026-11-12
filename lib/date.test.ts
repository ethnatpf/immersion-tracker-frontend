import { describe, expect, it } from "vitest";
import {
  dateInputToTimestamp,
  dateTimeInputToTimestamp,
  formatUserDateTime,
  isLocalDateTimeInPastOrPresent,
  isValidLocalDateTimeInput,
  isValidLocalDateInput,
  timestampToDateInput,
  timestampToTimeInput,
} from "./date";

describe("session dates", () => {
  it("converts a picked local calendar date to a full timestamp and back", () => {
    const timestamp = dateInputToTimestamp("2026-10-24");

    expect(timestamp).toMatch(/^2026-10-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(timestampToDateInput(timestamp)).toBe("2026-10-24");
  });

  it("combines a local date and selected time and restores the time for editing", () => {
    const timestamp = dateTimeInputToTimestamp("2026-10-24", "14:35:12");

    expect(timestamp).toBe(new Date(2026, 9, 24, 14, 35, 12).toISOString());
    expect(timestampToDateInput(timestamp)).toBe("2026-10-24");
    expect(timestampToTimeInput(timestamp)).toBe("14:35:12");
  });

  it("validates real local calendar dates and the selected maximum", () => {
    expect(isValidLocalDateInput("2026-02-28", "2026-02-28")).toBe(true);
    expect(isValidLocalDateInput("2026-02-29", "2026-12-31")).toBe(false);
    expect(isValidLocalDateInput("2027-01-01", "2026-12-31")).toBe(false);
  });

  it("rejects invalid local times", () => {
    expect(isValidLocalDateTimeInput("2026-10-24", "14:35:00")).toBe(true);
    expect(isValidLocalDateTimeInput("2026-10-24", "25:00:00")).toBe(false);
  });

  it("rejects a local time skipped by daylight saving", () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "America/New_York";

    try {
      expect(isValidLocalDateTimeInput("2026-03-08", "02:30:00")).toBe(false);
      expect(isValidLocalDateTimeInput("2026-03-08", "03:30:00")).toBe(true);
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("rejects local date-times after the current instant", () => {
    const now = new Date(2026, 2, 10, 12, 0, 0);

    expect(isLocalDateTimeInPastOrPresent("2026-03-10", "12:00:00", now))
      .toBe(true);
    expect(isLocalDateTimeInPastOrPresent("2026-03-10", "12:00:01", now))
      .toBe(false);
    expect(isLocalDateTimeInPastOrPresent("2026-03-09", "23:59:59", now))
      .toBe(true);
  });

  it("formats an instant in the requested user timezone", () => {
    expect(formatUserDateTime("2026-10-24T01:00:00.000Z", "America/Los_Angeles"))
      .toBe("Oct 23, 2026, 6:00 PM");
  });
});
