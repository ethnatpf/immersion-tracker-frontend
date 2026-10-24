"use client";

import { Component, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { isServerError } from "@/lib/query-options";
import { ServerErrorPage } from "@/components/error/server-error-page";

class ServerErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error !== null) {
      if (!isServerError(error)) throw error;
      return <ServerErrorPage status={error.status} requestId={error.requestId} onRetry={() => {
        this.props.onReset();
        this.setState({ error: null });
      }} />;
    }
    return this.props.children;
  }
}

// Catches HTTP 5xx query errors and replaces page content with the server error screen.
// Wrap page content so the app's navigation stays available.
export function ApiErrorBoundary({ children }: { children: ReactNode }) {
  return <QueryErrorResetBoundary>{({ reset }) => <ServerErrorBoundary onReset={reset}>{children}</ServerErrorBoundary>}</QueryErrorResetBoundary>;
}
