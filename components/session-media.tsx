import type { ComponentProps } from "react";
import {
  AudioLines,
  BookOpen,
  Film,
  Gamepad2,
  Headphones,
  Podcast,
  Radio,
  SquarePlay,
  Tv,
} from "lucide-react";
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
  game: {
    label: "Game",
    icon: Gamepad2,
    color: "#167d68",
    background: "#e8f4ee",
  },
  podcast: {
    label: "Podcast",
    icon: Podcast,
    color: "#416d79",
    background: "#edf4f5",
  },
  radio: {
    label: "Radio",
    icon: Radio,
    color: "#416d79",
    background: "#edf4f5",
  },
  audiobook: {
    label: "Audiobook",
    icon: Headphones,
    color: "#416d79",
    background: "#edf4f5",
  },
  audio: {
    label: "Audio",
    icon: AudioLines,
    color: "#416d79",
    background: "#edf4f5",
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
