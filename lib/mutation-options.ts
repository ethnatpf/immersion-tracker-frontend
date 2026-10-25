import { isServerError } from "@/lib/query-options";
import { showMutationError } from "@/lib/mutation-error";

export const mutationDefaults = {
  retry: false,
  throwOnError: isServerError,
  onError: (error: unknown) => {
    if (!isServerError(error)) showMutationError(error);
  },
};
