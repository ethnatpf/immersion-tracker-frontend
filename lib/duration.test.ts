import { describe, expect, it } from "vitest";
import { formatDuration, formatHours, formatHoursMinutes } from "./duration";

describe("duration formatting", () => {
  it("formats elapsed time without wrapping at 24 hours", () => {
    expect(formatDuration(1736100)).toBe("482:15:00");
    expect(formatDuration(65.9)).toBe("00:01:05");
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("converts seconds to hours with one decimal place", () => {
    expect(formatHours(0)).toBe("0.0h");
    expect(formatHours(3600)).toBe("1.0h");
    expect(formatHours(5400)).toBe("1.5h");
    expect(formatHours(6300)).toBe("1.8h");
  });

  it("formats hours and minutes without spaces or seconds", () => {
    expect(formatHoursMinutes(0)).toBe("0m");
    expect(formatHoursMinutes(3599)).toBe("59m");
    expect(formatHoursMinutes(3600)).toBe("1h");
    expect(formatHoursMinutes(6300)).toBe("1h45m");
    expect(formatHoursMinutes(1739700)).toBe("483h15m");
  });
});
