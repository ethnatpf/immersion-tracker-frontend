import type { DashboardStatisticsRange, DashboardStatisticsResponseDto } from "@/lib/api/generated/models";

export type MediaTime = "reading_time" | "audiovisual_time";

export function dailyMediaAverage(stats: Pick<DashboardStatisticsResponseDto, "total_immersion_time" | "average_time" | MediaTime>, key: MediaTime): number {
  return stats.total_immersion_time > 0 ? stats.average_time * stats[key] / stats.total_immersion_time : 0;
}

export function mediaAverage(
  stats: Pick<DashboardStatisticsResponseDto, "total_immersion_time" | "average_time" | "breakdown" | MediaTime>,
  key: MediaTime,
  range: DashboardStatisticsRange,
  timeZone: string,
): number {
  if (range === "week") return dailyMediaAverage(stats, key);
  const buckets = range === "month"
    ? stats.breakdown.filter((bucket) => bucket.start_date <= dateInTimeZone(new Date(), timeZone))
    : stats.breakdown;
  return buckets.length > 0 ? stats[key] / buckets.length : 0;
}

function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function bucketLabel(start: string, range: DashboardStatisticsRange): string {
  const date = new Date(`${start.slice(0, 10)}T00:00:00Z`);
  const options: Intl.DateTimeFormatOptions = range === "week" ? { weekday: "short" }
    : range === "month" ? { month: "short", day: "numeric" }
    : range === "year" ? { month: "short" } : { year: "numeric" };
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(date);
}

export function bucketTooltipLabel(start: string, range: DashboardStatisticsRange): string {
  const date = new Date(`${start.slice(0, 10)}T00:00:00Z`);
  if (range === "month") {
    const weekEnd = new Date(date);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const formatter = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return `${formatter.format(date)} – ${formatter.format(weekEnd)}`;
  }
  if (range !== "year" && range !== "total") return start;
  const options: Intl.DateTimeFormatOptions = range === "year"
    ? { month: "long", year: "numeric" }
    : { year: "numeric" };
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(date);
}
