"use client";

import { formatUserDate, formatUserDateTime } from "@/lib/date";
import { useUserTimeZone } from "@/lib/use-user-time-zone";

export function LocalizedDate({
  date,
  className,
  dateOnly = false,
}: {
  date: string;
  className?: string;
  dateOnly?: boolean;
}) {
  const timeZone = useUserTimeZone();
  const format = dateOnly ? formatUserDate : formatUserDateTime;

  return (
    <time dateTime={date} className={className}>
      {format(date, timeZone ?? "UTC")}
    </time>
  );
}
