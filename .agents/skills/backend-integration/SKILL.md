---
name: backend-integration
description: Bind Immersion Tracker UI to backend data using the generated SDK and authenticated proxy. Use when connecting or changing queries, mutations, filters, pagination, loading, empty states, or API error recovery. Excludes purely visual changes and backend-only implementation.
---

# Backend integration

Turn the design into a UI driven by real API responses, with explicit loading, empty, failure, and recovery behavior. Read the current implementation before extending it; the files linked below are the source of truth for existing behavior.

## Data flow and contract

The browser calls generated TanStack Query hooks, which use `apiFetch` to request `/api/backend/...`. The frontend proxy adds the server's access token and forwards the request to the backend. The response returns through the same path to the query cache and UI.

- Inspect the relevant Penpot designs and map each displayed value and interaction to the API contract. Confirm IDs versus codes, units, dates/time zones, nullable fields, filters, and pagination semantics. Format server values for display; do not substitute mock numbers or recreate backend business rules to fill missing fields. Report contract gaps explicitly.
- Reuse hooks, request/response models, and query-key helpers from [the generated SDK](../../../lib/api/generated/immersion.ts). Query hooks read server state; mutation hooks perform writes. Keep local state for user choices and form drafts, and derive display values from query data rather than copying responses into component state.
- If the contract changed or an endpoint is missing from the SDK, generate with `bun run api:generate`. [Orval configuration](../../../orval.config.ts) reads `OPENAPI_URL`, defaulting to `http://localhost:4000/api-json`. Never hand-edit `lib/api/generated`. If generation is blocked, report the blocker rather than inventing an API contract.
- Check [the proxy](../../../app/api/backend/[...path]/route.ts) before binding a new endpoint. Its `authorizedPaths` maps each endpoint to its allowed HTTP methods. Extend that map and export only the handlers the feature needs; generated mutation hooks alone do not make writes available through the proxy.
- Preserve the relative browser URL and server-only `API_URL`. Keep access-token handling in the proxy, preserve cancellation signals, upstream status codes, `X-Request-ID`, and private/no-store caching. Do not expose tokens or convert failed responses into successful empty data.

## Queries and user choices

- Pass all server-side filters and pagination parameters to the generated hook so its generated query key identifies the requested data. A changed language, period, or page should select the corresponding data, not merely update a label. Avoid hand-built cache keys when a generated helper exists.
- Run independent queries independently. Gate dependent queries with `enabled` until required settings, IDs, and selections are ready. Handle missing or unavailable prerequisites explicitly, including invalid saved preferences; do not request data with a placeholder ID.
- Use backend totals and pagination metadata. Reset pagination when a filter changes the result set. Preserve previous page data during fetching only when it helps the user, mark it busy, and prevent conflicting page actions while a request is pending.
- Choose freshness and retry options for the actual feature. Preserve the shared HTTP 5xx error policy when overriding query options; do not set `throwOnError: false` to bypass it.

## Loading, empty, and refreshing states

- Initial loading means usable data has not arrived. Use [Skeleton](../../../components/shadcn/skeleton.tsx) with the approximate shape of the content, and a named `role="status"` container. Disable controls that require unavailable data, while leaving independent sections usable.
- A disabled dependent query can be `isPending` without fetching. Check prerequisites first; `isLoading` means the first fetch is running, while `isFetching` also includes background refreshes. Do not leave a skeleton running forever when no valid selection exists.
- Empty means a successful response with no results or zero values. Show the appropriate empty message or real zero values only after success; missing data and request failures are not empty results.
- During background refreshes, keep useful existing data visible where appropriate and mark the affected content with `aria-busy`. Make stale or previous data distinguishable from the newly requested result. Any HTTP 5xx response still uses the page error screen, even when cached data exists.

## Shared error handling

Reuse these application-wide components rather than creating feature-specific copies:

| Component or module | Role |
| --- | --- |
| [ApiError / apiFetch](../../../lib/api/fetch.ts) | Failed HTTP responses become `ApiError` with `status`, `body`, and optional `requestId` from `X-Request-ID`. |
| [queryDefaults / isServerError](../../../lib/query-options.ts) | Shared query options throw HTTP 500–599 errors to the nearest boundary. Applied by [Providers](../../../app/providers.tsx). |
| [mutationDefaults](../../../lib/mutation-options.ts) / [showMutationError](../../../lib/mutation-error.tsx) | Shared mutation options show recoverable action failures in a toast, preserve backend 4xx validation messages, and throw HTTP 5xx errors to the page boundary. |
| [QueryError](../../../components/error/query-error.tsx) | Inline section error with a title, retry or sign-in action, and request ID when available. Pass the original error and a callback that retries the failed request. |
| [ApiErrorBoundary](../../../components/error/api-error-boundary.tsx) | Replaces wrapped content for HTTP 5xx errors and resets query errors on retry. [AppShell](../../../components/app-shell.tsx) wraps page content and resets the boundary when the pathname changes, leaving navigation available. |
| [ServerErrorPage](../../../components/error/server-error-page.tsx) | Designed responsive server error screen showing the actual HTTP status, retry, dashboard navigation, and an optional request ID. The boundary renders it. |
| [RequestId](../../../components/error/request-id.tsx) | Displays and copies the backend diagnostic ID, including copy success/failure feedback. Both error presentations reuse it. |

Apply these rules:

- **HTTP 500–599:** show the designed page error screen through `ApiErrorBoundary`, including HTTP 502/503/504 and failures during background fetching. Display the actual status code. Keep navigation outside the boundary. Ensure integrations outside `AppShell` have the required boundary/provider coverage.
- **GET/query failures other than HTTP 5xx:** use `QueryError` within the affected section, including recoverable HTTP 4xx responses and network errors. These requests load data rather than perform a user action, so keep their recovery inline.
- **User-action/mutation HTTP 4xx failures** (POST, PATCH, DELETE, and other writes): show an error toast. Display the backend's `message` when it is a string or an array of strings, including validation messages such as `url must be a URL address`. Use a friendly fallback when no usable message exists. Preserve the draft and let the user correct it and submit again; do not show a generic inline save error. Network failures during writes also use a friendly error toast.
- **HTTP 401 with `session_expired`:** offer sign-in with the current path and query string as the return destination, inline for queries and in the toast action for mutations. The proxy uses this code when the frontend session cannot provide an access token.
- **Backend HTTP 401:** the proxy returns `api_unauthorized`. Explain that authorization failed and offer retry; do not send an already signed-in user through a login loop. `QueryError` already makes this distinction.
- Preserve the original `ApiError` so status, error code, and request ID survive. Display the backend request ID when present, including in mutation toasts. Show backend user-facing 4xx messages as plain text; do not expose HTTP 5xx exception details, stack traces, or tokens.
- Retry the relevant query or let the user explicitly resubmit the action, and verify successful data replaces the failed state. A second failure should remain recoverable and display its own request ID.

## Writes and forms

- Use Zod for form validation and generated mutation hooks for submission. Keep validation feedback next to the relevant fields, preserve the user's draft on recoverable failures, and disable duplicate submission while pending.
- Query defaults do not apply to mutations. Reuse `mutationDefaults` from the application's QueryClient: its `onError` shows recoverable failures in a toast, `throwOnError: isServerError` preserves the page error rule, and automatic retries are disabled. Preserve these behaviors when overriding mutation options; do not add a second toast in a catch handler or replace the shared `onError` silently. Handle rejected `mutateAsync` promises without leaving them unhandled. Client-side Zod validation stays next to the relevant fields.
- After a successful write, invalidate or update affected queries using generated query-key helpers. Update all views affected by the write, such as history and statistics, without clearing unrelated cached data. Only show success or close a form after the server confirms success.
- Do not automatically repeat writes that could duplicate an operation. Error-screen recovery should restore a usable page, not silently resubmit a mutation.

## Component ownership and verification

Place reusable components, utilities, and types in shared locations and name them for their application-wide purpose. Scope them to a page or feature only when their behavior is specific to it. For example, generic duration formatting belongs in `lib/duration.ts`, even when first used by the dashboard. Existing dashboard implementations are examples of usage, not owners of shared infrastructure.

Use the [testing skill](../testing/SKILL.md) to select and implement meaningful tests. Exercise relevant loading, success, empty, non-5xx failure, HTTP 5xx page replacement, and recovery paths. Verify that changing inputs changes displayed data and that successful writes refresh affected views. Use distinct fixture values and real generated hooks with MSW.

Run the relevant tests, `bun run typecheck`, and `bun run lint` for implementation changes. Report checks performed and any blocked contract generation or backend-dependent verification. A documentation-only skill update does not require application tests.
