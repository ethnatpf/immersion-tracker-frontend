"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/shadcn/sonner";
import { queryDefaults } from "@/lib/query-options";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { mutationDefaults } from "@/lib/mutation-options";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { normalizeRoute } from "@/lib/observability/normalize-route";

type FaroWindow = Window & {
  faro?: { api: { setView: (view: { name: string }) => void } };
};

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: queryDefaults, mutations: mutationDefaults } }));
  useEffect(() => {
    (window as FaroWindow).faro?.api.setView({ name: normalizeRoute(pathname) });
  }, [pathname]);
  return <QueryClientProvider client={queryClient}><TooltipProvider>{children}</TooltipProvider><Toaster position="bottom-right" /></QueryClientProvider>;
}
