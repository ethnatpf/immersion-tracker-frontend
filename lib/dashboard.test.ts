import { describe, expect, it } from "vitest";
import { bucketLabel, dailyMediaAverage } from "./dashboard";

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
});
