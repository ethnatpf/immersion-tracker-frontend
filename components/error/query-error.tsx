"use client";

import { ApiError } from "@/lib/api/fetch";
import { Button } from "@/components/shadcn/button";
import { RequestId } from "@/components/error/request-id";

// Shows a section's error inline while the rest of the page stays usable.
export function QueryError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  const code = error instanceof ApiError && typeof error.body === "object" && error.body !== null && "code" in error.body ? error.body.code : undefined;
  const needsLogin = error instanceof ApiError && error.status === 401 && code === "session_expired";
  const apiRejectedSession = error instanceof ApiError && error.status === 401 && !needsLogin;
  const returnTo = typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;
  return (
    <div role="alert" className="rounded-xl border border-border bg-white p-5 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted-foreground">{needsLogin ? "Your session needs to be renewed. Please sign in again." : apiRejectedSession ? "Your sign-in succeeded, but the server could not authorize this request. Please try again later." : "Please try again in a moment."}</p>
      {needsLogin ? <a href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`} className="mt-3 inline-flex font-medium text-primary underline underline-offset-4">Sign in again</a>
        : <Button variant="outline" onClick={onRetry} className="mt-3">Try again</Button>}
      {error instanceof ApiError && error.requestId && <RequestId key={error.requestId} requestId={error.requestId} />}
    </div>
  );
}
