"use client";

import { useSyncExternalStore } from "react";
import { getUserTimeZone } from "@/lib/date";

export function useUserTimeZone() {
  return useSyncExternalStore(
    () => () => {},
    getUserTimeZone,
    () => null,
  );
}
