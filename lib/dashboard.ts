import type { DashboardStatisticsRange, DashboardStatisticsResponseDto } from "@/lib/api/generated/models";

export type MediaTime = "reading_time" | "audiovisual_time";

export function dailyMediaAverage(stats: Pick<DashboardStatisticsResponseDto, "total_immersion_time" | "average_time" | MediaTime>, key: MediaTime): number {
  return stats.total_immersion_time > 0 ? stats.average_time * stats[key] / stats.total_immersion_time : 0;
}

export function bucketLabel(start: string, range: DashboardStatisticsRange): string {
  const date = new Date(`${start.slice(0, 10)}T00:00:00Z`);
  const options: Intl.DateTimeFormatOptions = range === "week" ? { weekday: "short" }
    : range === "month" ? { month: "short", day: "numeric" }
    : range === "year" ? { month: "short" } : { year: "numeric" };
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(date);
}
