"use client";

import { formatUserDateTime } from "@/lib/date";
import { useUserTimeZone } from "@/lib/use-user-time-zone";

export function LocalizedDate({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  const timeZone = useUserTimeZone();

  return (
    <time dateTime={date} className={className}>
      {timeZone
        ? formatUserDateTime(date, timeZone)
        : formatUserDateTime(date, "UTC")}
    </time>
  );
}
