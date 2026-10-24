import { describe, expect, it } from "vitest";
import { formatDuration, formatHours } from "./duration";

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
});
