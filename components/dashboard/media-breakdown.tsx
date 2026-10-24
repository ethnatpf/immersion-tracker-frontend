"use client";

import { BookOpen, SquarePlay } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  DashboardStatisticsRange,
  DashboardStatisticsResponseDto,
} from "@/lib/api/generated/models";
import {
  bucketLabel,
  dailyMediaAverage,
  type MediaTime,
} from "@/lib/dashboard";
import { formatDuration, formatHours } from "@/lib/duration";

const rangeLabels: Record<DashboardStatisticsRange, string> = {
  week: "Weekly view",
  month: "Monthly view",
  year: "Yearly view",
  total: "All time",
};

export function MediaBreakdown({
  stats,
  media,
  language,
  range,
}: {
  stats: DashboardStatisticsResponseDto;
  media: MediaTime;
  language: string;
  range: DashboardStatisticsRange;
}) {
  const reading = media === "reading_time";
  const title = reading ? "Reading media breakdown" : "Audio media breakdown";
  const Icon = reading ? BookOpen : SquarePlay;
  const color = reading ? "#5e7fa9" : "#167d68";
  const lightColor = reading ? "#dde6f3" : "#cce7dc";
  const data = stats.breakdown.map((bucket) => ({
    date: bucket.start_date,
    label: bucketLabel(bucket.start_date, range),
    hours: bucket[media] / 3600,
    seconds: bucket[media],
  }));
  const maximum = Math.max(...data.map((bucket) => bucket.hours), 0);
  const average = dailyMediaAverage(stats, media);
  const headingId = `${media}-heading`;
  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      className="gap-0 rounded-2xl border border-border p-4 text-foreground ring-0 xl:p-6"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-[11px]"
          style={{ backgroundColor: lightColor, color }}
        >
          <Icon aria-hidden="true" className="size-[19px]" />
        </span>
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-base font-semibold leading-[23px] xl:text-lg"
          >
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[10px]">
            <span
              className="max-w-full truncate rounded px-2 py-0.5"
              style={{ backgroundColor: lightColor, color }}
            >
              {language}
            </span>
            <span className="text-muted-foreground">{rangeLabels[range]}</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground xl:mt-1">
        {reading
          ? "Novels, manga, and native essays"
          : "Listening and video immersion"}
      </p>
      <div className="mb-2 mt-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground">Daily average</p>
          <p
            className="mt-1 text-[25px] font-semibold leading-8"
            style={{ color }}
          >
            {formatHours(average)}
            <span className="text-lg"> / day</span>
          </p>
        </div>
        <p className="pb-1 text-[10px] text-muted-foreground">
          {formatHours(stats[media])} in this period
        </p>
      </div>
      {maximum > 0 ? (
        <>
          <ChartContainer
            config={{
              hours: { label: reading ? "Reading" : "Audiovisual", color },
            }}
            className="mt-auto h-[148px] w-full aspect-auto"
            aria-label={`${title} in hours`}
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 22, left: 0, right: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#e3eae7" />
              <YAxis hide domain={[0, maximum * 1.25]} tickCount={4} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                minTickGap={12}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload[0]?.payload?.date}
                    formatter={(_, __, item) => (
                      <span className="font-medium tabular-nums">
                        {formatDuration(item.payload.seconds)}
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="hours"
                maxBarSize={36}
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              >
                {data.map((bucket) => (
                  <Cell
                    key={bucket.date}
                    fill={bucket.hours === maximum ? color : lightColor}
                  />
                ))}
                {data.length <= 8 && (
                  <LabelList
                    dataKey="hours"
                    position="top"
                    offset={8}
                    formatter={(value) => `${Number(value).toFixed(1)}h`}
                    className="fill-muted-foreground text-[10px]"
                  />
                )}
              </Bar>
            </BarChart>
          </ChartContainer>
          <table className="sr-only">
            <caption>{title} data</caption>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.map((bucket) => (
                <tr key={bucket.date}>
                  <th scope="row">{bucket.date}</th>
                  <td>{formatDuration(bucket.seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="flex min-h-[148px] items-center justify-center text-center text-sm text-muted-foreground">
          No {reading ? "reading" : "audiovisual"} immersion in this period.
        </div>
      )}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[11px]">
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">{language}</span>
        <span className="shrink-0">{formatHours(average)} / day</span>
      </div>
    </Card>
  );
}
