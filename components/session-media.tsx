import type { ComponentProps } from "react";
import { BookOpen, Film, SquarePlay, Tv } from "lucide-react";
import type { SessionHistoryItemResponseDtoType } from "@/lib/api/generated/models";

export const sessionMediaStyles = {
  book: {
    label: "Book",
    icon: BookOpen,
    color: "#5e7fa9",
    background: "#edf2fa",
  },
  manga: {
    label: "Manga",
    icon: BookOpen,
    color: "#b96c30",
    background: "#fcf1e7",
  },
  anime: {
    label: "Anime",
    icon: Tv,
    color: "#8b6ea5",
    background: "#f3eef8",
  },
  drama: {
    label: "Drama",
    icon: Film,
    color: "#8b6ea5",
    background: "#f3eef8",
  },
  video: {
    label: "Video",
    icon: SquarePlay,
    color: "#167d68",
    background: "#e8f4ee",
  },
} as const satisfies Record<
  SessionHistoryItemResponseDtoType,
  {
    label: string;
    icon: typeof BookOpen;
    color: string;
    background: string;
  }
>;

export function SessionTypeIcon({
  type,
  ...props
}: Omit<ComponentProps<typeof BookOpen>, "ref"> & {
  type: SessionHistoryItemResponseDtoType;
}) {
  const Icon = sessionMediaStyles[type].icon;
  return <Icon {...props} />;
}
