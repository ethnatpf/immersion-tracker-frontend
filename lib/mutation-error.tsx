"use client";

import { toast } from "sonner";
import { ApiError } from "@/lib/api/fetch";
import { RequestId } from "@/components/error/request-id";

export function showMutationError(error: unknown) {
  const apiError = error instanceof ApiError ? error : undefined;
  const body = apiError?.body;
  const code =
    typeof body === "object" && body !== null && "code" in body
      ? body.code
      : undefined;
  const message =
    apiError &&
    apiError.status >= 400 &&
    apiError.status < 500 &&
    typeof body === "object" &&
    body !== null &&
    "message" in body
      ? body.message
      : undefined;
  const messages = (
    typeof message === "string"
      ? [message]
      : Array.isArray(message)
        ? message.filter((item): item is string => typeof item === "string")
        : []
  )
    .map((item) => item.trim())
    .filter(Boolean);
  const needsLogin = apiError?.status === 401 && code === "session_expired";
  const title = needsLogin
    ? "Your session needs to be renewed. Please sign in again."
    : apiError?.status === 401
      ? "The server could not authorize this request. Please try again."
      : messages.length === 1
        ? messages[0]
        : "Could not complete this action. Please try again.";
  return toast.error(title, {
    description: (
      <>
        {messages.length > 1 && (
          <ul className="list-inside list-disc">
            {messages.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
        {apiError?.requestId && <RequestId requestId={apiError.requestId} />}
      </>
    ),
    ...(needsLogin
      ? {
          action: {
            label: "Sign in again",
            onClick: () => {
              const returnTo =
                window.location.pathname + window.location.search;
              const loginUrl = new URL("/auth/login", window.location.origin);
              loginUrl.searchParams.set("returnTo", returnTo);
              window.location.assign(loginUrl);
            },
          },
        }
      : {}),
  });
}
