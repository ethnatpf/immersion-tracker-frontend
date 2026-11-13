"use client";

import { BookOpen, Headphones, SquarePlay } from "lucide-react";
import type { CreateContentDtoType } from "@/lib/api/generated/models";
import {
  contentTypesByCategory,
  type ContentCategory,
} from "@/lib/content-types";
import { sessionMediaStyles } from "@/components/session-media";
import { cn } from "@/lib/utils";

const categories: {
  id: ContentCategory;
  label: string;
  icon: typeof Headphones;
}[] = [
  { id: "audio", label: "Audio", icon: Headphones },
  { id: "audiovisual", label: "Audiovisual", icon: SquarePlay },
  { id: "reading", label: "Reading", icon: BookOpen },
];

function categoryFor(type: CreateContentDtoType): ContentCategory {
  if (contentTypesByCategory.audio.includes(type)) return "audio";
  if (contentTypesByCategory.reading.includes(type)) return "reading";
  return "audiovisual";
}

export function ContentTypeSelector({
  type,
  onTypeChange,
  className,
}: {
  type: CreateContentDtoType;
  onTypeChange: (type: CreateContentDtoType) => void;
  className?: string;
}) {
  const selectedCategory = categoryFor(type);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div role="group" aria-label="Content category" className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {categories.map((category) => {
          const Icon = category.icon;
          const selected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onTypeChange(contentTypesByCategory[category.id][0])
              }
              className={cn(
                "flex h-[62px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-[#f9fbfa] text-center text-[11px] leading-tight text-foreground transition-colors sm:h-14 sm:flex-row sm:justify-start sm:gap-2.5 sm:text-left",
                selected && "border-primary bg-[#e8f4ee] text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg bg-[#eff5f2] text-muted-foreground sm:h-full sm:w-14 sm:shrink-0 sm:rounded-l-xl sm:rounded-r-none",
                  selected && "bg-white/70 text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col sm:gap-0.5">
                <span className="truncate font-semibold">{category.label}</span>
                <span className="text-[9px] text-muted-foreground sm:text-[10px]">
                  {contentTypesByCategory[category.id].length} types
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div role="group" aria-label={`${categories.find((item) => item.id === selectedCategory)?.label} content types`} className="flex gap-2">
        {contentTypesByCategory[selectedCategory].map((value) => {
          const selected = type === value;
          const label = sessionMediaStyles[value].label;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onTypeChange(value)}
              className={cn(
                "min-w-0 flex-1 rounded-full border border-border bg-[#f1f6f4] px-1.5 py-2 text-xs leading-tight text-foreground transition-colors sm:min-w-[118px] sm:flex-none sm:px-4",
                selected && "border-primary bg-primary font-semibold text-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
