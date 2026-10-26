# Immersion Tracker

Frontend for tracking immersion sessions while learning a language. Built with Next.js App Router, Tailwind CSS, shadcn (Base UI), TanStack React Query, and Zod. Designs live in the Penpot file **Immersion tracker**.

## Development

Use Bun and Node.js 24+ for the tooling.

```sh
bun install
cp .env.example .env.local
bun run dev
```

The frontend runs at http://localhost:3000. Set `API_URL` to the backend origin (default `http://localhost:4000`). Browser API requests use `/api/backend`, an authenticated server proxy that adds the Auth0 bearer token.

Use shadcn components where supported and Zod for form validation.

For complete feature implementation, invoke `$implement-feature` using the local [implement-feature skill](.agents/skills/implement-feature/SKILL.md). It covers requirements, planning, tests-first development, implementation review, and final checks.

## Authentication

Use an Auth0 **Regular Web Application** with **New Universal Login**. Configure these local URLs:

| Auth0 application setting | Local value                           |
| ------------------------- | ------------------------------------- |
| Allowed Callback URLs     | `http://localhost:3000/auth/callback` |
| Allowed Logout URLs       | `http://localhost:3000`               |
| Allowed Web Origins       | `http://localhost:3000`               |

Fill in the Auth0 variables in `.env.local` using `.env.example` and your application's settings. Use the hostname only for `AUTH0_DOMAIN`. Set `AUTH0_AUDIENCE` to the Auth0 API Identifier matching the backend's `AUTH_AUDIENCE`. Generate `AUTH0_SECRET` with `openssl rand -hex 32`, then restart the dev server. Sign out and in again after changing the audience so the session has an API access token.

For deployment, use your HTTPS origin for `APP_BASE_URL` and the URLs registered in Auth0.

When using an Auth0 custom domain, the backend's `AUTH_ISSUER_BASE_URL` must match that domain (for example, `https://auth.example.com/`). The API audience stays the same.

## API generation

With the backend running:

```sh
bun run api:generate
```

Orval loads Next.js environment files and reads `OPENAPI_URL` (default `http://localhost:4000/api-json`). It generates React Query hooks, models, and MSW handlers into `lib/api/generated`. Commit these files with API changes; do not edit them manually. Builds and tests use committed output and do not require a running backend.

The SDK uses the relative `/api/backend` path. `API_URL` is server-only and can be configured at runtime without rebuilding the browser bundle.

## Tests and checks

```sh
bun run test                 # All Vitest tests, once
bun run test:watch           # Watch mode
bun run test:unit            # Node: *.test.ts
bun run test:integration     # jsdom + React Testing Library + MSW: *.test.tsx
bun run typecheck
bun run lint
bun run build
```

Use `bun run test`, rather than Bun's built-in `bun test`, to run Vitest.

Use `test/render.tsx` for isolated QueryClients and `test/server.ts` to register MSW handlers. Unexpected requests fail tests.

Testing decisions and practices live in the local [testing skill](.agents/skills/testing/SKILL.md).

## End-to-end testing

Playwright runs Chromium tests under `e2e/`. Install the browser before running:

```sh
bunx playwright install chromium
```

Playwright starts the development server locally and builds/starts the production app when `CI` is set. Locally it can reuse a running server. Failures retain traces and screenshots under ignored test artifacts. Add journey tests when requested or agreed for a feature.

End-to-end tests require a running backend with test data and a dedicated Auth0 test account. To let Playwright sign in automatically, copy the example and fill in the test account credentials:

```sh
cp playwright/credentials.example.json playwright/credentials.local.json
```

`playwright/credentials.local.json` is gitignored. Keep this account dedicated to testing because browser journeys may create content and sessions. For Playwright Test, the credentials file triggers Auth0 sign-in and saves the browser session under the ignored `playwright/.auth/` directory. For visual checks with the Playwright MCP server, navigate to the local app and complete Auth0 sign-in in the MCP browser.

Run the tests with the saved session:

```sh
bun run test:e2e
```

Without either the credentials file or an `E2E_AUTH_STATE` file, authenticated journeys are skipped.
