"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { TZDate } from "react-day-picker";
import { Button } from "@/components/shadcn/button";
import { Calendar } from "@/components/shadcn/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";

// Date-only values use UTC throughout so choosing a day never shifts it in another time zone.
export function DatePicker({
  value,
  onChange,
  max,
  disabled,
  id,
  ariaLabel = "Choose date",
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new TZDate(`${value}T00:00:00Z`, "UTC") : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        disabled={disabled}
        render={
          <Button
            variant="outline"
            className="h-12 w-full justify-start gap-3 rounded-[10px] bg-[#f9fbfa] px-3 text-left font-normal focus-visible:border-primary focus-visible:ring-primary/25"
          />
        }
      >
        <CalendarIcon
          aria-hidden="true"
          className="size-[18px] shrink-0 text-muted-foreground"
        />
        {selected
          ? new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }).format(selected)
          : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-auto p-0"
        aria-label={ariaLabel}
      >
        <Calendar
          mode="single"
          required
          timeZone="UTC"
          selected={selected}
          defaultMonth={selected}
          autoFocus
          disabled={
            max ? { after: new TZDate(`${max}T00:00:00Z`, "UTC") } : undefined
          }
          onSelect={(date) => {
            onChange(date.toISOString().slice(0, 10));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
