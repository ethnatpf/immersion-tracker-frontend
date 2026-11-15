import { afterEach, describe, expect, it, vi } from "vitest";
import { bucketLabel, bucketTooltipLabel, dailyMediaAverage, mediaAverage } from "./dashboard";

afterEach(() => vi.useRealTimers());

describe("dashboard presentation", () => {
  it("uses the server's daily average to split reading and audiovisual time", () => {
    const stats = { total_immersion_time: 7200, reading_time: 1800, audiovisual_time: 5400, average_time: 3600 };
    expect(dailyMediaAverage(stats, "reading_time")).toBe(900);
    expect(dailyMediaAverage(stats, "audiovisual_time")).toBe(2700);
    expect(dailyMediaAverage({ ...stats, total_immersion_time: 0 }, "reading_time")).toBe(0);
  });

  it("labels the API's UTC daily, weekly, monthly, and yearly buckets", () => {
    expect(bucketLabel("2026-10-12", "week")).toBe("Mon");
    expect(bucketLabel("2026-10-12", "month")).toBe("Oct 12");
    expect(bucketLabel("2026-10-01", "year")).toBe("Oct");
    expect(bucketLabel("2026-01-01", "total")).toBe("2026");
  });

  it("averages monthly media time across elapsed weekly buckets only", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
    const stats = {
      total_immersion_time: 0,
      average_time: 0,
      reading_time: 11_700,
      breakdown: [
        { start_date: "2026-10-26", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2026-11-02", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2026-11-09", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2026-11-16", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2026-11-23", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2026-11-30", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
      ],
    };

    expect(mediaAverage(stats, "reading_time", "month", "UTC")).toBe(3900);
  });

  it("averages yearly and total media time by displayed month and year buckets", () => {
    const stats = {
      total_immersion_time: 0,
      average_time: 0,
      reading_time: 1200,
      breakdown: [
        { start_date: "2025-11-01", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2025-12-01", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
        { start_date: "2026-01-01", reading_time: 0, audiovisual_time: 0, audio_time: 0 },
      ],
    };

    expect(mediaAverage(stats, "reading_time", "year", "UTC")).toBe(400);
    expect(mediaAverage(stats, "reading_time", "total", "UTC")).toBe(400);
  });

  it("uses readable month and year labels in chart tooltips", () => {
    expect(bucketTooltipLabel("2026-11-09", "month")).toBe("Nov 9 – Nov 15");
    expect(bucketTooltipLabel("2026-11-01", "year")).toBe("November 2026");
    expect(bucketTooltipLabel("2026-01-01", "total")).toBe("2026");
  });
});
