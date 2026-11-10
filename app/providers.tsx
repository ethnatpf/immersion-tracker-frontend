"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/shadcn/sonner";
import { queryDefaults } from "@/lib/query-options";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { mutationDefaults } from "@/lib/mutation-options";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { setFaroRoute } from "@/instrumentation-client";

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: queryDefaults, mutations: mutationDefaults } }));
  useEffect(() => setFaroRoute(pathname), [pathname]);
  return <QueryClientProvider client={queryClient}><TooltipProvider>{children}</TooltipProvider><Toaster position="bottom-right" /></QueryClientProvider>;
}
