import type { CreateContentDtoType } from "@/lib/api/generated/models";

export type ContentCategory = "audio" | "audiovisual" | "reading";

export const contentTypesByCategory: Record<
  ContentCategory,
  CreateContentDtoType[]
> = {
  audio: ["podcast", "radio", "audiobook", "audio"],
  audiovisual: ["anime", "drama", "video", "game"],
  reading: ["manga", "book"],
};
