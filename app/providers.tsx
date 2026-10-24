"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { queryDefaults } from "@/lib/query-options";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: queryDefaults } }));
  return <QueryClientProvider client={queryClient}>{children}<Toaster position="bottom-right" /></QueryClientProvider>;
}
