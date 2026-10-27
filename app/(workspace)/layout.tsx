import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/require-session";

export const instant = false;

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();
  return <AppShell email={user.email}>{children}</AppShell>;
}
