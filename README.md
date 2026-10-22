# Immersion Tracker

Frontend for tracking immersion sessions while learning a language. Built with Next.js App Router, Tailwind CSS, shadcn (Base UI), TanStack React Query, and Zod. Designs live in the Penpot file **Immersion tracker**.

## Development

Use Bun and Node.js 24+ for the tooling.

```sh
bun install
cp .env.example .env.local
bun run dev
```

The frontend runs at http://localhost:3000. Browser API requests go directly to `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

Use shadcn components where supported and Zod for form validation.

## API generation

With the backend running:

```sh
bun run api:generate
```

Orval loads Next.js environment files and reads `OPENAPI_URL` (default `http://localhost:4000/api-json`). It generates React Query hooks, models, and MSW handlers into `lib/api/generated`. Commit these files with API changes; do not edit them manually. Builds and tests use committed output and do not require a running backend.

`NEXT_PUBLIC_API_URL` controls browser requests independently of generation; use an origin without a trailing slash. Next.js embeds public environment variables at build time, so set this value before building for deployment.

The root Query provider supplies the application's QueryClient. Generated hooks accept request options, including headers and cancellation. The shared fetch transport throws `ApiError` with `status` and `body` for non-success responses and handles empty responses.

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

The integration example in `test/api-query.test.tsx` exercises a real generated hook with explicit MSW fixtures, including an HTTP failure and retry. Reuse `test/render.tsx` for isolated QueryClients and `test/server.ts` to register handlers. Unexpected requests fail tests. Async Server Components are not supported by this Vitest setup.

Testing decisions and practices live in the local [testing skill](.agents/skills/testing/SKILL.md).

## End-to-end testing

Playwright is configured for Chromium under `e2e/`; there are no journey tests yet. Before the first run, install its browser:

```sh
bunx playwright install chromium
bun run test:e2e
```

Playwright starts the development server locally and builds/starts the production app when `CI` is set. Locally it can reuse a running server. Failures retain traces and screenshots under ignored test artifacts. Add journey tests when requested or agreed for a feature; running the command before any tests exist reports "No tests found".
