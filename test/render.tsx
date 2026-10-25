import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { ApiErrorBoundary } from "@/components/error/api-error-boundary";
import { queryDefaults } from "@/lib/query-options";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { mutationDefaults } from "@/lib/mutation-options";

export function renderWithQuery(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { ...queryDefaults, retry: false, gcTime: 0 },
      mutations: mutationDefaults,
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}><TooltipProvider><ApiErrorBoundary>{children}</ApiErrorBoundary></TooltipProvider></QueryClientProvider>;
  }
  return { queryClient, ...render(ui, { ...options, wrapper: Wrapper }) };
}
