import { ApiError } from "@/lib/api/fetch";

export function isServerError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status >= 500 && error.status < 600;
}

export const queryDefaults = {
  throwOnError: isServerError,
};
