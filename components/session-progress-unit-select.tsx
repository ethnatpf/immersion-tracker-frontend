"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import type { ReadingProgressUnit } from "@/lib/session-progress";

export function SessionProgressUnitSelect({
  id,
  value,
  onValueChange,
  allowPages,
  disabled = false,
}: {
  id?: string;
  value: ReadingProgressUnit;
  onValueChange: (value: ReadingProgressUnit) => void;
  allowPages: boolean;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as ReadingProgressUnit)
      }
    >
      <SelectTrigger
        id={id}
        aria-label="Progress unit"
        className="!h-12 w-full bg-[#f9fbfa]"
      >
        <SelectValue>
          {value === "page" ? "Pages" : "Chapters"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className="!w-[228px] max-w-[calc(100vw-2rem)]"
      >
        {allowPages && (
          <SelectItem value="page">Pages</SelectItem>
        )}
        <SelectItem value="chapter">Chapters</SelectItem>
      </SelectContent>
    </Select>
  );
}
