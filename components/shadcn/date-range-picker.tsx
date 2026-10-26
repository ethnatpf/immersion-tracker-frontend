"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { TZDate, type DateRange } from "react-day-picker";
import { formatCompactUtcDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shadcn/button";
import { Calendar } from "@/components/shadcn/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";

export type DateRangeValue = { from?: string; to?: string };

function toDate(value?: string) {
  return value ? new TZDate(`${value}T00:00:00Z`, "UTC") : undefined;
}

function toValue(range?: DateRange): DateRangeValue {
  return {
    from: range?.from?.toISOString().slice(0, 10),
    to: range?.to?.toISOString().slice(0, 10),
  };
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const selected: DateRange | undefined = draft.from
    ? { from: toDate(draft.from), to: toDate(draft.to) }
    : undefined;
  const label =
    value.from && value.to
      ? `${formatCompactUtcDate(value.from)} – ${formatCompactUtcDate(value.to)}`
      : value.from
        ? `From ${formatCompactUtcDate(value.from)}`
        : "Date range";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-12 w-full justify-between rounded-xl bg-white px-4 text-sm",
              className,
            )}
          />
        }
      >
        <CalendarDays
          aria-hidden="true"
          className="size-[18px] text-muted-foreground"
        />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[calc(100vw-40px)] rounded-xl p-3"
      >
        <Calendar
          mode="range"
          timeZone="UTC"
          selected={selected}
          onSelect={(range) => setDraft(toValue(range))}
          numberOfMonths={1}
          autoFocus
        />
        <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
          <Button
            variant="ghost"
            onClick={() => {
              onChange({});
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            disabled={!draft.from || !draft.to}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
