---
name: testing
description: Select, write, and review meaningful unit, component integration, and end-to-end tests for the Immersion Tracker frontend. Use when adding or changing application behavior or its tests.
---

# Immersion Tracker testing

Choose unit and component integration tests autonomously based on the behavior changed. E2E journeys are normally requested by the user; if an unrequested journey would add meaningful confidence, ask before implementing it. Explicit requests to add an E2E test already authorize that work.

## Implementation workflow

- For calculations, domain rules, and other behavior that warrants unit tests, use TDD: write the tests first, run them and confirm they fail for the intended missing behavior, then implement until they pass. Refactor with the tests staying green. Tooling or setup errors do not count as the expected failure.
- For other behavior, prefer tests first when the expected behavior is clear and the work is not exploratory. During layout exploration or other uncertain implementation, implement first, then add relevant tests once the behavior is settled.
- Test order does not make coverage optional: always add or update relevant tests before considering the work complete. Preserve the E2E agreement above; when browser coverage is relevant, request it rather than silently omit it.

## Choose the useful boundary

- When writing or reviewing a test, ask: “Could this test pass while the feature is visibly broken?” If so, assert the user’s expected outcome. For example, when changing a filter, return distinct response data and verify that the displayed values update, alongside any useful request assertions. Choose fixture values that expose plausible mix-ups, such as IDs versus codes or reading versus audiovisual time. Focus on likely mistakes rather than asserting everything.
- Test lasting, relevant application behavior. Do not add assertions for temporary placeholders or scaffolding, such as “not implemented yet” toasts. When testing nearby interactions, exercise real navigation or established behavior so completing a feature does not invalidate unrelated tests.
- Use Vitest unit tests for calculations, domain rules, validation decisions, and boundary cases. Avoid tests that merely forward arguments to an SDK, duplicate generated code, or assert implementation details.
- Use React Testing Library component integration tests for observable behavior across components, forms, generated hooks, and API responses. Intercept HTTP with MSW rather than mocking React Query hooks or fetch. Cover relevant loading, empty, success, validation, failure, and recovery behavior; select scenarios that matter to the feature.
- Use Playwright for complete user journeys. Async Server Components cannot be tested with this Vitest setup; explain when that leaves a meaningful browser coverage gap and propose a journey test.

## Repository conventions

- Unit tests: `*.test.ts`, Node environment. Component integration tests: `*.test.tsx`, jsdom. E2E tests: `e2e/*.spec.ts`.
- Use `test/render.tsx` for a fresh QueryClient per test with retries disabled. Use the server exported by `test/server.ts`; shared setup rejects unhandled requests and resets handlers between tests.
- Import generated MSW handler factories from `lib/api/generated/immersion.msw.ts`. Pass explicit, typed fixtures for assertions; do not rely on random generated response values. Override error responses with MSW handlers where the spec does not generate that status.
- Never hand-edit generated hooks, models, or mocks. Regenerate them with `bun run api:generate` when the API contract changes.
- Assert visible outcomes with accessible roles and labels; use user-event for interactions. Avoid snapshots as the primary assertion and avoid testing shadcn internals.
- In React 19 tests that intentionally trigger an error boundary, pass React Testing Library's `onCaughtError` render option for that test to avoid React's default stderr logging. Keep assertions on the rendered fallback and recovery; avoid broad `console.error` mocks.
- Keep backend-dependent browser journeys separate from MSW component tests. Agree on authentication and test data prerequisites for each journey; do not silently substitute mocks for a requested complete journey.

## Verification

Run the relevant suite with `bun run test:unit` or `bun run test:integration`; use `bun run test` for both. `bun test` invokes a different runner. Use `bun run test:e2e` for browser journeys. Install Chromium with `bunx playwright install chromium`.

Use `bun run typecheck` and `bun run lint` for changed TypeScript/configuration. Report what passed and any checks blocked by missing services or browser dependencies.
